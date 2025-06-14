import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PenTool, Type, X, Upload, Plus, Download } from 'lucide-react';

interface G702BuilderProps {
  projectId: string;
  formData: any;
  setFormData: (data: any) => void;
  sovItems: any[];
  setSovItems: (items: any[]) => void;
}

export function G702Builder({ projectId, formData, setFormData, sovItems, setSovItems }: G702BuilderProps) {
  const [previousPayments, setPreviousPayments] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string>('current');
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('type');
  const [typedSignature, setTypedSignature] = useState('');

  useEffect(() => {
    fetchPreviousPayments();
    fetchApplications();
    fetchChangeOrders();
  }, [projectId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchChangeOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'Approved')
        .order('number');

      if (error) throw error;
      setChangeOrders(data || []);
    } catch (error) {
      console.error('Error fetching change orders:', error);
    }
  };

  const fetchPreviousPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('current_payment_due')
        .eq('project_id', projectId)
        .lt('application_number', formData.applicationNumber);

      if (error) throw error;

      const total = data.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
      setPreviousPayments(total);
      setFormData(prev => ({ ...prev, previousCertificates: total }));
    } catch (error) {
      console.error('Error fetching previous payments:', error);
    }
  };

  const importSOVItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', projectId)
        .order('item_number');

      if (error) throw error;

      const mappedItems = (data || []).map(item => ({
        id: item.id,
        itemNumber: item.item_number,
        description: item.description,
        scheduledValue: item.scheduled_value,
        changeOrders: item.change_orders || 0,
        previousApplications: item.previous_applications || 0,
        thisPeriod: item.this_period || 0,
        materialsStored: item.materials_stored || 0,
        totalCompletedAndStored: item.total_completed_and_stored || 0,
        percentComplete: item.percent_complete || 0,
        category: item.category
      }));

      setSovItems(mappedItems);
      toast.success('Schedule of Values imported successfully');
    } catch (error) {
      console.error('Error importing SOV items:', error);
      toast.error('Failed to import Schedule of Values');
    }
  };

  const addChangeOrderToSOV = (changeOrderId: string) => {
    const changeOrder = changeOrders.find(co => co.id === changeOrderId);
    if (!changeOrder) return;

    // Find the SOV item to add the change order to, or create a new one
    const updatedItems = [...sovItems];
    const existingItemIndex = updatedItems.findIndex(item => 
      item.description.toLowerCase().includes(changeOrder.description.toLowerCase().substring(0, 20))
    );

    if (existingItemIndex >= 0) {
      // Add to existing item
      updatedItems[existingItemIndex].changeOrders += changeOrder.amount;
    } else {
      // Create new SOV item for change order
      const newItem = {
        id: `co-${changeOrder.id}`,
        itemNumber: `CO-${changeOrder.number}`,
        description: `Change Order ${changeOrder.number}: ${changeOrder.description}`,
        scheduledValue: 0,
        changeOrders: changeOrder.amount,
        previousApplications: 0,
        thisPeriod: 0,
        materialsStored: 0,
        totalCompletedAndStored: 0,
        percentComplete: 0,
        category: 'Change Orders'
      };
      updatedItems.push(newItem);
    }

    setSovItems(updatedItems);
    toast.success(`Change Order ${changeOrder.number} added to SOV`);
  };

  const updateSOVItemThisPeriod = useCallback(async (id: string, value: number) => {
    // Update local state immediately for better UX
    const updatedItems = sovItems.map(item => 
      item.id === id 
        ? { ...item, thisPeriod: value }
        : item
    );
    setSovItems(updatedItems);

    // Only update database for real SOV items (not change order items)
    if (!id.startsWith('co-')) {
      try {
        const { error } = await supabase
          .from('sov_items')
          .update({
            this_period: value
          })
          .eq('id', id);

        if (error) {
          console.error('Error updating SOV item:', error);
          toast.error('Failed to update item');
        }
      } catch (error) {
        console.error('Error updating SOV item:', error);
        toast.error('Failed to update item');
      }
    }
  }, [sovItems, setSovItems]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL();
      setFormData({ ...formData, contractorSignature: dataURL });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setFormData({ ...formData, contractorSignature: null });
      }
    }
  };

  const generateTypedSignature = () => {
    if (!typedSignature.trim()) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '32px "Brush Script MT", cursive';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2 + 10);
      
      const dataURL = canvas.toDataURL();
      setFormData({ ...formData, contractorSignature: dataURL });
    }
  };

  useEffect(() => {
    if (signatureType === 'type' && typedSignature) {
      generateTypedSignature();
    }
  }, [typedSignature, signatureType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && signatureType === 'draw') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [signatureType]);

  const calculateTotals = () => {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders;
    const totalThisPeriod = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);
    const balanceToFinish = totalContract - totalCompleted;

    return {
      totalScheduledValue,
      totalChangeOrders,
      totalContract,
      totalThisPeriod,
      totalCompleted,
      balanceToFinish
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* SOV Import and Change Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule of Values & Change Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={importSOVItems} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Import Schedule of Values
            </Button>
          </div>

          {changeOrders.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Available Change Orders:</Label>
              <div className="space-y-2">
                {changeOrders.map((co) => (
                  <div key={co.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">CO-{co.number}: </span>
                      <span className="text-sm">{co.description}</span>
                      <span className="ml-2 text-green-600">${co.amount.toLocaleString()}</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => addChangeOrderToSOV(co.id)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add to SOV
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>G703 Continuation Sheet Builder</CardTitle>
            <div className="flex items-center gap-4">
              <Label htmlFor="applicationSelect">Application:</Label>
              <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Application #{formData.applicationNumber}</SelectItem>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      Application #{app.application_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-8 gap-4 text-sm font-medium border-b pb-2">
              <div>Item & Description</div>
              <div>Scheduled Value</div>
              <div>Change Orders</div>
              <div>Total Contract</div>
              <div>Work Completed This Period</div>
              <div>Total Completed</div>
              <div>% Complete</div>
              <div>Balance to Finish</div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {sovItems.map((item) => {
                const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
                const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
                const percentComplete = totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0;
                const balanceToFinish = totalContract - totalCompleted;
                
                return (
                  <div key={item.id} className="grid grid-cols-8 gap-2 items-center text-sm border-b pb-2">
                    <div className="font-medium">
                      <div>{item.itemNumber}</div>
                      <div className="text-xs text-gray-600 truncate">{item.description}</div>
                    </div>
                    <div>${(item.scheduledValue || 0).toLocaleString()}</div>
                    <div>${(item.changeOrders || 0).toLocaleString()}</div>
                    <div className="font-medium">${totalContract.toLocaleString()}</div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.thisPeriod || 0}
                        onChange={(e) => updateSOVItemThisPeriod(item.id, Number(e.target.value) || 0)}
                        className="w-full"
                        disabled={selectedApplication !== 'current'}
                      />
                    </div>
                    <div>${totalCompleted.toLocaleString()}</div>
                    <div>{percentComplete.toFixed(1)}%</div>
                    <div>${balanceToFinish.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-8 gap-2 items-center text-sm font-bold border-t pt-2 bg-gray-50">
              <div>TOTALS</div>
              <div>${totals.totalScheduledValue.toLocaleString()}</div>
              <div>${totals.totalChangeOrders.toLocaleString()}</div>
              <div>${totals.totalContract.toLocaleString()}</div>
              <div>${totals.totalThisPeriod.toLocaleString()}</div>
              <div>${totals.totalCompleted.toLocaleString()}</div>
              <div>{totals.totalContract > 0 ? ((totals.totalCompleted / totals.totalContract) * 100).toFixed(1) : 0}%</div>
              <div>${totals.balanceToFinish.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retainagePercentage">Retainage Percentage</Label>
              <Input
                id="retainagePercentage"
                type="number"
                step="0.1"
                value={formData.retainagePercentage}
                onChange={(e) => setFormData({ ...formData, retainagePercentage: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="periodFrom">Period From</Label>
              <Input
                id="periodFrom"
                type="date"
                value={formData.periodFrom}
                onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label>Distribution To</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="owner"
                  checked={formData.distributionTo?.owner || false}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      distributionTo: { ...formData.distributionTo, owner: checked }
                    })
                  }
                />
                <Label htmlFor="owner">Owner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="architect"
                  checked={formData.distributionTo?.architect || false}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      distributionTo: { ...formData.distributionTo, architect: checked }
                    })
                  }
                />
                <Label htmlFor="architect">Architect</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contractor"
                  checked={formData.distributionTo?.contractor || false}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      distributionTo: { ...formData.distributionTo, contractor: checked }
                    })
                  }
                />
                <Label htmlFor="contractor">Contractor</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractor Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle>Contractor Certification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractorSignatory">Signatory Name</Label>
                <Input
                  id="contractorSignatory"
                  value={formData.contractorSignatory || ''}
                  onChange={(e) => setFormData({ ...formData, contractorSignatory: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contractorTitle">Title</Label>
                <Input
                  id="contractorTitle"
                  value={formData.contractorTitle || ''}
                  onChange={(e) => setFormData({ ...formData, contractorTitle: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Signature</Label>
              <Tabs value={signatureType} onValueChange={(value) => setSignatureType(value as 'draw' | 'type')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="type" className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Type Signature
                  </TabsTrigger>
                  <TabsTrigger value="draw" className="flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    Draw Signature
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="type" className="mt-4">
                  <div className="space-y-3">
                    <Input
                      placeholder="Type your signature here"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      className="text-2xl font-script"
                      style={{ fontFamily: '"Brush Script MT", cursive' }}
                    />
                    {formData.contractorSignature && (
                      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Signature Preview:</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, contractorSignature: null });
                              setTypedSignature('');
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        </div>
                        <img 
                          src={formData.contractorSignature} 
                          alt="Typed Signature" 
                          className="max-h-20 border border-gray-300 bg-white rounded"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="draw" className="mt-4">
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="border border-gray-300 bg-white rounded cursor-crosshair w-full"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearCanvas}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Click and drag to draw your signature
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
