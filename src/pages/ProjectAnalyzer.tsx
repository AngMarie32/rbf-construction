
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, MessageSquare, Brain, FileText, BarChart3, TrendingUp, X, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadedPlan {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  analysis?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ProjectAnalyzer() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [uploadedPlans, setUploadedPlans] = useState<UploadedPlan[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingPlan, setAnalyzingPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handlePlanUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      // Validate file type for construction plans
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error(`File type ${file.type} not supported for plan analysis`);
        continue;
      }

      const planId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newPlan: UploadedPlan = {
        id: planId,
        name: file.name,
        type: file.type,
        size: file.size
      };

      setUploadedPlans(prev => [...prev, newPlan]);
      toast.success(`Plan "${file.name}" uploaded successfully`);
    }
  };

  const analyzePlan = async (planId: string) => {
    const plan = uploadedPlans.find(p => p.id === planId);
    if (!plan) return;

    setAnalyzingPlan(planId);
    
    try {
      // Simulate AI analysis - this would be replaced with actual AI integration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = `
## Plan Analysis: ${plan.name}

### Scope of Work Identified:
- **Foundation Work**: Concrete footings and slab-on-grade construction
- **Framing**: Wood frame construction with engineered lumber
- **Roofing**: Asphalt shingle roofing system
- **Electrical**: Standard residential electrical installation
- **Plumbing**: Basic residential plumbing systems
- **HVAC**: Central air conditioning and heating system

### Estimated Measurements:
- **Total Square Footage**: ~2,450 sq ft
- **Foundation Area**: ~2,600 sq ft
- **Roof Area**: ~2,800 sq ft
- **Linear Feet of Framing**: ~380 LF
- **Number of Electrical Outlets**: ~45
- **Plumbing Fixtures**: 8 fixtures

### Key Considerations:
- Site preparation and grading required
- Potential for underground utilities coordination
- Building permit requirements for electrical and plumbing
- Material delivery and staging areas needed

### Recommended Next Steps:
1. Conduct detailed site survey
2. Obtain soil analysis for foundation design
3. Coordinate with utility companies
4. Prepare detailed material takeoffs
5. Develop construction schedule
      `;

      setUploadedPlans(prev => 
        prev.map(p => 
          p.id === planId 
            ? { ...p, analysis: mockAnalysis }
            : p
        )
      );

      toast.success('Plan analysis completed');
    } catch (error) {
      console.error('Error analyzing plan:', error);
      toast.error('Failed to analyze plan');
    } finally {
      setAnalyzingPlan(null);
    }
  };

  const removePlan = (planId: string) => {
    setUploadedPlans(prev => prev.filter(p => p.id !== planId));
    toast.success('Plan removed');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    // Simulate AI response with context about uploaded plans
    setTimeout(() => {
      const planContext = uploadedPlans.length > 0 
        ? `Based on the ${uploadedPlans.length} plan(s) you've uploaded, ` 
        : '';
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${planContext}I can help analyze your construction plans for scope of work and measurements. ${inputMessage.includes('measure') ? 'For accurate measurements, I would need to process the uploaded plans through our AI analysis system.' : 'Feel free to ask about specific aspects like materials, labor estimates, or project timeline.'} 

To integrate with a custom AI analysis system, you would need to provide the API endpoint details.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
    }, 1500);
  };

  const quickQuestions = [
    "Analyze uploaded plans for scope of work",
    "Estimate material quantities from plans",
    "Identify potential construction challenges",
    "Calculate approximate project timeline",
    "Compare this project to similar builds"
  ];

  return (
    <Layout title="Project Plan Analyzer" subtitle="AI-powered construction plan analysis and scope estimation">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        
        {/* Left Panel - Plan Upload & Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Plan Analysis Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Upload Construction Plans</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handlePlanUpload}
                    className="hidden"
                    id="plan-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.xls,.xlsx"
                  />
                  <label htmlFor="plan-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Upload construction plans, blueprints, or drawings
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Images (JPG, PNG, TIFF), Excel files
                    </p>
                  </label>
                </div>
              </div>

              {uploadedPlans.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Uploaded Plans</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedPlans.map((plan) => (
                      <div key={plan.id} className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium truncate">{plan.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlan(plan.id)}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => analyzePlan(plan.id)}
                            disabled={analyzingPlan === plan.id}
                            className="text-xs"
                          >
                            {analyzingPlan === plan.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <BarChart3 className="w-3 h-3 mr-1" />
                                Analyze
                              </>
                            )}
                          </Button>
                          {plan.analysis && (
                            <Badge variant="outline" className="text-xs">
                              Analyzed
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Quick Analysis Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start h-auto p-3"
                    onClick={() => setInputMessage(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Analysis Results & Chat */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Plan Analysis & AI Assistant
                {selectedProject && (
                  <Badge variant="outline" className="ml-2">
                    Project Selected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Analysis Results */}
              {uploadedPlans.some(plan => plan.analysis) && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border">
                  <h3 className="font-semibold text-blue-900 mb-2">Latest Analysis Results</h3>
                  {uploadedPlans.filter(plan => plan.analysis).map(plan => (
                    <div key={plan.id} className="mb-3">
                      <div className="text-sm text-blue-800 whitespace-pre-line">
                        {plan.analysis}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">Construction Plan Analyzer</p>
                    <p className="text-sm">
                      Upload your construction plans and ask questions about scope, measurements, and analysis.
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Supported formats:</strong> PDF blueprints, CAD drawings, images (JPG, PNG, TIFF), and Excel spreadsheets.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-white border shadow-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-gray-500">Analyzing plans and generating response...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about scope of work, measurements, or analysis of your uploaded plans..."
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                  className="self-end"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
