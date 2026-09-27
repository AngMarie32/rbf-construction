import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, MessageSquare, Brain, FileText, BarChart3, X } from 'lucide-react';
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
        .select('id, name, status')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));
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

      // --- Upload to Supabase Storage ---
      const filePath = `public/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('plan_documents')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }
      
      // --- Get public URL ---
      const { data: urlData } = supabase.storage
        .from('plan_documents')
        .getPublicUrl(uploadData.path);

      const planId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newPlan: UploadedPlan = {
        id: planId,
        name: file.name,
        type: file.type,
        size: file.size,
        url: urlData.publicUrl,
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
      const analysisMessage = `Please analyze the uploaded construction plan: ${plan.name}. Provide a detailed analysis including scope of work, estimated measurements, material requirements, labor considerations, and any potential challenges or recommendations.`;

      const { data, error } = await supabase.functions.invoke('ai-plan-analysis', {
        body: {
          message: analysisMessage,
          uploadedPlans: [plan],
          selectedProject: selectedProject
        }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.response) {
        setUploadedPlans(prev => 
          prev.map(p => 
            p.id === planId 
              ? { ...p, analysis: data.response }
              : p
          )
        );
        toast.success('Plan analysis completed');
      } else {
        throw new Error(data.error || 'Failed to analyze plan');
      }
    } catch (error) {
      console.error('Error analyzing plan:', error);
      toast.error('Failed to analyze plan. Please ensure your API key is configured correctly.');
    } finally {
      setAnalyzingPlan(null);
    }
  };

  const removePlan = async (planId: string) => {
    const planToRemove = uploadedPlans.find(p => p.id === planId);
    if (!planToRemove) return;

    // Also remove from storage if it has a URL
    if (planToRemove.url) {
      try {
        const path = new URL(planToRemove.url).pathname.split('/plan_documents/')[1];
        if (path) {
          const { error } = await supabase.storage.from('plan_documents').remove([path]);
          if (error) {
            console.error('Failed to remove file from storage:', error.message);
            toast.error('Could not remove file from storage.');
          }
        }
      } catch (error) {
        console.error('Error parsing URL for file removal:', error);
      }
    }

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

    try {
      const { data, error } = await supabase.functions.invoke('ai-plan-analysis', {
        body: {
          message: inputMessage,
          uploadedPlans: uploadedPlans,
          selectedProject: selectedProject
        }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.response) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please ensure your OpenAI API key is properly configured and try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message to AI assistant');
    } finally {
      setLoading(false);
    }
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full font-playfair">
        {/* Left Panel - Plan Upload & Controls */}
        <div className="space-y-4 flex flex-col h-full">
          <Card className="bg-white/95 shadow-lg border-2 border-primary/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-playfair text-2xl text-primary">
                <Brain className="w-5 h-5" />
                Plan Analysis Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Select Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="rounded-lg border-primary/40 shadow-sm font-playfair">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id} className="font-playfair">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Upload Construction Plans</label>
                <div className="border-2 border-dashed border-primary bg-blue-50/40 rounded-xl p-4 text-center transition-all duration-150 hover:border-primary hover:bg-blue-100 group">
                  <input
                    type="file"
                    multiple
                    onChange={handlePlanUpload}
                    className="hidden"
                    id="plan-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.xls,.xlsx"
                  />
                  <label htmlFor="plan-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-10 h-10 text-primary/70 mx-auto mb-2 group-hover:scale-105 transition-transform" />
                    <p className="text-sm text-gray-700 font-playfair">
                      Drag and drop or click to upload plans
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Images (JPG, PNG, TIFF), Excel files
                    </p>
                  </label>
                </div>
              </div>

              {uploadedPlans.length > 0 && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Uploaded Plans</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedPlans.map((plan) => (
                      <div key={plan.id} className="p-3 bg-secondary/65 rounded-lg border flex flex-col gap-1 shadow hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
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
                            className="text-xs px-3"
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
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary px-2">
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

          <Card className="shadow-md bg-white/95 border border-primary/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-playfair text-xl text-primary">
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
                    className="w-full text-left justify-start h-auto p-3 border-primary/20 font-playfair hover:bg-primary/10"
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
        <div className="lg:col-span-2 flex flex-col h-full">
          <Card className="flex-1 flex flex-col h-full bg-white/95 shadow-xl border-2 border-primary/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-playfair text-2xl text-primary">
                <Brain className="w-5 h-5" />
                Plan Analysis & AI Assistant
                {selectedProject && (
                  <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary px-2">
                    Project Selected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Analysis Results */}
              {uploadedPlans.some(plan => plan.analysis) && (
                <div className="mb-4 p-4 bg-blue-50/80 rounded-lg border border-primary/20 shadow font-playfair animate-fade-in">
                  <h3 className="font-semibold text-blue-900 mb-2 text-lg font-playfair">Latest Analysis Results</h3>
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
                    <p className="text-lg font-medium font-playfair">Construction Plan Analyzer</p>
                    <p className="text-sm">
                      Upload your construction plans and ask questions about scope, measurements, and analysis.
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg font-playfair">
                      <p className="text-sm text-blue-800">
                        <strong>Supported formats:</strong> PDF blueprints, CAD drawings, images (JPG, PNG, TIFF), and Excel spreadsheets.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl shadow font-playfair ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary/90 border border-primary/20 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
                
                {loading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white border shadow-sm p-3 rounded-xl flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-gray-500">Analyzing plans and generating response...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex gap-2 pt-2 border-t border-primary/10">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about scope of work, measurements, or analysis of your uploaded plans..."
                  className="flex-1 min-h-[60px] resize-none rounded-xl font-playfair bg-white/90 border-primary/20"
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
                  className="self-end px-5 py-2 rounded-xl bg-primary text-white font-playfair shadow hover:bg-primary/90 transition"
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
