import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  description?: string
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'neutral',
  description 
}: StatsCardProps) {
  const changeColors = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm ${changeColors[changeType]}`}>
                {change}
              </p>
            )}
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
          <div className="bg-green-50 p-3 rounded-full">
            <Icon className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}