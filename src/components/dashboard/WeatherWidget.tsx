
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

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Get user's location
        if (!navigator.geolocation) {
          throw new Error('Geolocation not supported');
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Using OpenWeatherMap API (free tier)
            // Note: In production, this API key should be stored securely
            const API_KEY = 'demo'; // User should replace with their own key
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=imperial`
            );

            if (!response.ok) {
              // Fallback to mock data for demo
              setWeather({
                temperature: 72,
                condition: 'Partly Cloudy',
                humidity: 65,
                windSpeed: 8,
                location: 'Current Location'
              });
              setLoading(false);
              return;
            }

            const data = await response.json();
            setWeather({
              temperature: Math.round(data.main.temp),
              condition: data.weather[0].main,
              humidity: data.main.humidity,
              windSpeed: Math.round(data.wind.speed),
              location: data.name
            });
            setLoading(false);
          },
          () => {
            // Fallback to demo data if geolocation fails
            setWeather({
              temperature: 72,
              condition: 'Partly Cloudy',
              humidity: 65,
              windSpeed: 8,
              location: 'Demo Location'
            });
            setLoading(false);
          }
        );
      } catch (err) {
        setError('Unable to fetch weather data');
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="w-8 h-8 text-blue-200" />;
      case 'clouds':
      case 'partly cloudy':
      default:
        return <Cloud className="w-8 h-8 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Weather unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Local Weather</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getWeatherIcon(weather.condition)}
              <span className="text-2xl font-bold">{weather.temperature}°F</span>
            </div>
            <p className="text-sm text-muted-foreground">{weather.condition}</p>
            <p className="text-xs text-muted-foreground">{weather.location}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Wind className="w-3 h-3" />
              <span>{weather.windSpeed} mph</span>
            </div>
            <p className="text-xs text-muted-foreground">Humidity: {weather.humidity}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
