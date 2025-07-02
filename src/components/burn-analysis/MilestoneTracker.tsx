
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { MilestoneAnalysis } from '@/utils/enhancedBurnAnalytics';

interface MilestoneTrackerProps {
  milestones: MilestoneAnalysis[];
  loading?: boolean;
}

export function MilestoneTracker({ milestones, loading = false }: MilestoneTrackerProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string, daysDelayed: number) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Delayed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'In Progress':
        return daysDelayed > 0 ? 
          <AlertCircle className="w-5 h-5 text-amber-500" /> : 
          <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string, daysDelayed: number) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'Delayed':
        return 'bg-red-500';
      case 'In Progress':
        return daysDelayed > 0 ? 'bg-amber-500' : 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Project Milestones & Budget Checkpoints
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {milestones.length} milestones
        </Badge>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Milestones Found</h3>
            <p className="text-gray-500 mb-4">
              Add project milestones to track budget performance at key project checkpoints.
            </p>
            <Button variant="outline">Add Milestone</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(milestone.status, milestone.daysDelayed)}
                      <h3 className="font-semibold text-gray-900">{milestone.name}</h3>
                      <Badge 
                        className={`${getStatusColor(milestone.status, milestone.daysDelayed)} text-white text-xs`}
                      >
                        {milestone.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Target Date:</span>
                        <div className="font-medium">
                          {format(parseISO(milestone.targetDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      
                      {milestone.actualDate && (
                        <div>
                          <span className="text-gray-500">Actual Date:</span>
                          <div className="font-medium">
                            {format(parseISO(milestone.actualDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-gray-500">Budget Checkpoint:</span>
                        <div className="font-medium">
                          ${milestone.budgetCheckpoint.toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Actual Spent:</span>
                        <div className={`font-medium ${
                          milestone.actualSpent > milestone.budgetCheckpoint ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${milestone.actualSpent.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress and Variance */}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completion</span>
                          <span>{milestone.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${milestone.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                      
                      {milestone.daysDelayed !== 0 && (
                        <div className="text-sm">
                          <Badge variant={milestone.daysDelayed > 0 ? 'destructive' : 'default'}>
                            {milestone.daysDelayed > 0 ? '+' : ''}{milestone.daysDelayed} days
                          </Badge>
                        </div>
                      )}
                      
                      {milestone.variance !== 0 && (
                        <div className="text-sm">
                          <Badge variant={milestone.variance > 0 ? 'destructive' : 'default'}>
                            {milestone.variance > 0 ? '+' : ''}${milestone.variance.toLocaleString()}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
