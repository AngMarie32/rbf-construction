
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, FileText, TrendingUp, AlertCircle } from 'lucide-react';

interface ApplicationSummaryProps {
  totals: {
    totalScheduledValue: number;
    totalChangeOrders: number;
    totalContract: number;
    totalThisPeriod: number;
    totalCompleted: number;
    balanceToFinish: number;
  };
  applicationNumber: number;
  retainagePercentage: number;
}

export function ApplicationSummary({ totals, applicationNumber, retainagePercentage }: ApplicationSummaryProps) {
  const completionPercentage = totals.totalContract > 0 ? (totals.totalCompleted / totals.totalContract) * 100 : 0;
  const retainageAmount = totals.totalCompleted * (retainagePercentage / 100);
  const netPayment = totals.totalThisPeriod - (totals.totalThisPeriod * (retainagePercentage / 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Project Overview */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileText className="w-5 h-5" />
            Application #{applicationNumber}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-700">Project Completion</span>
                <span className="font-medium text-blue-900">{completionPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Contract Value</p>
                <p className="text-lg font-bold text-blue-900">${totals.totalContract.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Remaining</p>
                <p className="text-lg font-bold text-blue-900">${totals.balanceToFinish.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Period */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <TrendingUp className="w-5 h-5" />
            This Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-green-600 font-medium">Work Completed</p>
              <p className="text-2xl font-bold text-green-900">${totals.totalThisPeriod.toLocaleString()}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-green-600">Less Retainage ({retainagePercentage}%)</p>
                <p className="font-semibold text-red-600">-${retainageAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-green-600">Net Payment</p>
                <p className="font-semibold text-green-800">${netPayment.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <DollarSign className="w-5 h-5" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-orange-700">Original Contract</span>
              <span className="font-medium">${totals.totalScheduledValue.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-orange-700">Change Orders</span>
              <span className="font-medium text-green-600">+${totals.totalChangeOrders.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-orange-700 font-medium">Total Completed</span>
              <span className="font-bold text-orange-900">${totals.totalCompleted.toLocaleString()}</span>
            </div>

            {totals.totalThisPeriod === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded">
                <AlertCircle className="w-3 h-3" />
                <span>No work reported this period</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
