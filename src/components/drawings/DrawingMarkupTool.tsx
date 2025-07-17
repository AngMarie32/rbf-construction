
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pencil, 
  Square, 
  Circle, 
  Type, 
  MousePointer, 
  Download, 
  Upload, 
  MessageCircle,
  Users,
  Palette,
  Trash2,
  Undo,
  Redo
} from 'lucide-react';
import { toast } from 'sonner';

interface DrawingAnnotation {
  id: string;
  type: 'pencil' | 'rectangle' | 'circle' | 'text' | 'comment';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  text?: string;
  author: string;
  timestamp: Date;
}

interface DrawingMarkupToolProps {
  projectId?: string;
  drawingUrl?: string;
}

export function DrawingMarkupTool({ projectId, drawingUrl }: DrawingMarkupToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingAnnotation['type']>('pencil');
  const [currentColor, setCurrentColor] = useState('#ff0000');
  const [annotations, setAnnotations] = useState<DrawingAnnotation[]>([]);
  const [collaborators, setCollaborators] = useState([
    { id: '1', name: 'John Doe', color: '#ff0000', active: true },
    { id: '2', name: 'Jane Smith', color: '#00ff00', active: false },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'];

  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select' },
    { id: 'pencil' as const, icon: Pencil, label: 'Draw' },
    { id: 'rectangle' as const, icon: Square, label: 'Rectangle' },
    { id: 'circle' as const, icon: Circle, label: 'Circle' },
    { id: 'text' as const, icon: Type, label: 'Text' },
    { id: 'comment' as const, icon: MessageCircle, label: 'Comment' },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
            }
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      toast.success('Drawing uploaded successfully');
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'select') return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'comment') {
      const comment = prompt('Enter your comment:');
      if (comment) {
        const annotation: DrawingAnnotation = {
          id: Date.now().toString(),
          type: 'comment',
          x,
          y,
          color: currentColor,
          text: comment,
          author: 'Current User',
          timestamp: new Date(),
        };
        setAnnotations(prev => [...prev, annotation]);
        toast.success('Comment added');
      }
      return;
    }

    // Start drawing annotation
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool === 'select' || currentTool === 'comment') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx && currentTool === 'pencil') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setAnnotations([]);
        toast.success('Canvas cleared');
      }
    }
  };

  const downloadMarkup = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'marked-up-drawing.png';
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Markup downloaded');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Drawing Markup & Collaboration
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={downloadMarkup}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="drawing-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('drawing-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Drawing
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="markup" className="space-y-4">
            <TabsList>
              <TabsTrigger value="markup">Markup Tools</TabsTrigger>
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="markup" className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1">
                  {tools.map((tool) => (
                    <Button
                      key={tool.id}
                      variant={currentTool === tool.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentTool(tool.id)}
                    >
                      <tool.icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
                
                <div className="h-6 w-px bg-gray-300" />
                
                <div className="flex items-center gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        currentColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                    />
                  ))}
                </div>
                
                <div className="h-6 w-px bg-gray-300" />
                
                <Button variant="outline" size="sm">
                  <Undo className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Redo className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Canvas */}
              <div className="border rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="max-w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </TabsContent>

            <TabsContent value="collaboration" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Collaborators
                </h3>
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: collaborator.color }}
                        />
                        <span className="font-medium">{collaborator.name}</span>
                        <Badge variant={collaborator.active ? "default" : "secondary"}>
                          {collaborator.active ? "Active" : "Offline"}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        View Changes
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Comments & Annotations</h3>
                <div className="space-y-3">
                  {annotations.filter(a => a.type === 'comment').map((comment) => (
                    <div key={comment.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" style={{ color: comment.color }} />
                            <span className="font-medium">{comment.author}</span>
                            <span className="text-sm text-gray-500">
                              {comment.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{comment.text}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
