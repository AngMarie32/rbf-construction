
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CloudRain, Sun, CloudSnow, Wind, AlertTriangle, Calendar } from 'lucide-react';
import { Task } from '@/types';
import { format, addDays, isWeekend } from 'date-fns';

interface WeatherScheduleAdjusterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onUpdateTasks: (updates: { taskId: string; updates: Partial<Task> }[]) => Promise<void>;
}

interface WeatherImpact {
  date: Date;
  condition: 'rain' | 'snow' | 'wind' | 'extreme_heat' | 'extreme_cold';
  severity: 'low' | 'medium' | 'high';
  affectedTasks: Task[];
  delayDays: number;
}

interface WeatherRule {
  condition: string;
  taskTypes: string[];
  delayDays: number;
  enabled: boolean;
}

const defaultWeatherRules: WeatherRule[] = [
  { condition: 'Heavy Rain', taskTypes: ['Concrete', 'Roofing', 'Painting'], delayDays: 1, enabled: true },
  { condition: 'Snow', taskTypes: ['Concrete', 'Masonry', 'Excavation'], delayDays: 2, enabled: true },
  { condition: 'High Winds', taskTypes: ['Crane Operations', 'Roofing'], delayDays: 1, enabled: true },
  { condition: 'Extreme Heat', taskTypes: ['Concrete', 'Asphalt'], delayDays: 0.5, enabled: false },
  { condition: 'Extreme Cold', taskTypes: ['Concrete', 'Painting'], delayDays: 1, enabled: false }
];

// Mock weather forecast (in a real app, this would come from a weather API)
const mockWeatherForecast = [
  { date: new Date(2024, 11, 15), condition: 'rain', severity: 'high' },
  { date: new Date(2024, 11, 16), condition: 'rain', severity: 'medium' },
  { date: new Date(2024, 11, 22), condition: 'snow', severity: 'high' },
  { date: new Date(2024, 11, 23), condition: 'snow', severity: 'medium' },
  { date: new Date(2024, 11, 28), condition: 'wind', severity: 'high' }
];

export function WeatherScheduleAdjuster({
  open,
  onOpenChange,
  tasks,
  onUpdateTasks
}: WeatherScheduleAdjusterProps) {
  const [weatherRules, setWeatherRules] = useState<WeatherRule[]>(defaultWeatherRules);
  const [loading, setLoading] = useState(false);
  const [weatherImpacts, setWeatherImpacts] = useState<WeatherImpact[]>([]);

  useEffect(() => {
    if (open) {
      analyzeWeatherImpacts();
    }
  }, [open, tasks, weatherRules]);

  const analyzeWeatherImpacts = () => {
    const impacts: WeatherImpact[] = [];

    mockWeatherForecast.forEach(forecast => {
      const enabledRule = weatherRules.find(rule => 
        rule.enabled && 
        rule.condition.toLowerCase().includes(forecast.condition)
      );

      if (enabledRule) {
        const affectedTasks = tasks.filter(task => {
          const taskDate = new Date(task.startDate);
          const forecastDate = new Date(forecast.date);
          
          // Check if task is scheduled during weather event
          return taskDate <= forecastDate && 
                 new Date(task.endDate) >= forecastDate &&
                 enabledRule.taskTypes.some(type => 
                   task.title.toLowerCase().includes(type.toLowerCase())
                 );
        });

        if (affectedTasks.length > 0) {
          impacts.push({
            date: forecast.date,
            condition: forecast.condition as any,
            severity: forecast.severity as any,
            affectedTasks,
            delayDays: enabledRule.delayDays
          });
        }
      }
    });

    setWeatherImpacts(impacts);
  };

  const handleToggleRule = (index: number) => {
    const updatedRules = [...weatherRules];
    updatedRules[index].enabled = !updatedRules[index].enabled;
    setWeatherRules(updatedRules);
  };

  const handleApplyAdjustments = async () => {
    setLoading(true);
    try {
      const updates: { taskId: string; updates: Partial<Task> }[] = [];

      weatherImpacts.forEach(impact => {
        impact.affectedTasks.forEach(task => {
          const delayDays = Math.ceil(impact.delayDays);
          let adjustedStartDate = new Date(task.startDate);
          let adjustedEndDate = new Date(task.endDate);

          // If weather event falls within task duration, delay the task
          if (adjustedStartDate <= impact.date && adjustedEndDate >= impact.date) {
            adjustedStartDate = addDays(impact.date, delayDays);
            adjustedEndDate = addDays(adjustedEndDate, delayDays);

            // Skip weekends for the new dates
            while (isWeekend(adjustedStartDate)) {
              adjustedStartDate = addDays(adjustedStartDate, 1);
            }
            while (isWeekend(adjustedEndDate)) {
              adjustedEndDate = addDays(adjustedEndDate, 1);
            }

            updates.push({
              taskId: task.id,
              updates: {
                startDate: adjustedStartDate,
                endDate: adjustedEndDate
              }
            });
          }
        });
      });

      if (updates.length > 0) {
        await onUpdateTasks(updates);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error applying weather adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'rain': return <CloudRain className="w-4 h-4 text-blue-500" />;
      case 'snow': return <CloudSnow className="w-4 h-4 text-blue-300" />;
      case 'wind': return <Wind className="w-4 h-4 text-gray-500" />;
      default: return <Sun className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 border-red-300 bg-red-50';
      case 'medium': return 'text-orange-600 border-orange-300 bg-orange-50';
      case 'low': return 'text-yellow-600 border-yellow-300 bg-yellow-50';
      default: return 'text-gray-600 border-gray-300 bg-gray-50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-600" />
            Weather-Based Schedule Adjustments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Weather Rules Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Weather Impact Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weatherRules.map((rule, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{rule.condition}</div>
                      <div className="text-sm text-gray-500">
                        Affects: {rule.taskTypes.join(', ')} | Delay: {rule.delayDays} days
                      </div>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => handleToggleRule(index)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weather Forecast & Impacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Upcoming Weather Impacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weatherImpacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Sun className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
                  <p>No weather-related schedule impacts detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {weatherImpacts.map((impact, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getWeatherIcon(impact.condition)}
                          <span className="font-medium">
                            {format(impact.date, 'MMM dd, yyyy')}
                          </span>
                          <Badge className={getSeverityColor(impact.severity)}>
                            {impact.severity} severity
                          </Badge>
                        </div>
                        <Badge variant="outline">
                          {impact.delayDays} day delay
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <strong>Affected Tasks ({impact.affectedTasks.length}):</strong>
                        <div className="mt-1">
                          {impact.affectedTasks.map(task => (
                            <span key={task.id} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-xs">
                              {task.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Impact Summary */}
          {weatherImpacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Adjustment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {weatherImpacts.length}
                    </div>
                    <div className="text-sm text-gray-600">Weather Events</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {weatherImpacts.reduce((sum, impact) => sum + impact.affectedTasks.length, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Affected Tasks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {Math.max(...weatherImpacts.map(impact => impact.delayDays))}
                    </div>
                    <div className="text-sm text-gray-600">Max Delay (days)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyAdjustments} 
            disabled={loading || weatherImpacts.length === 0}
          >
            {loading ? 'Applying...' : `Apply Weather Adjustments (${weatherImpacts.length} events)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
