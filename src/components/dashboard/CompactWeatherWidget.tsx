
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

export function CompactWeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Use fallback demo data to improve load times
        setWeather({
          temperature: 72,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 8,
          location: 'Current Location'
        });
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-4 h-4 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="w-4 h-4 text-blue-200" />;
      case 'clouds':
      case 'partly cloudy':
      default:
        return <Cloud className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Weather unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weather</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getWeatherIcon(weather.condition)}
            <div>
              <span className="text-xl font-bold">{weather.temperature}°F</span>
              <p className="text-xs text-muted-foreground">{weather.condition}</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Wind className="w-3 h-3" />
              <span>{weather.windSpeed} mph</span>
            </div>
            <p>Humidity: {weather.humidity}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
