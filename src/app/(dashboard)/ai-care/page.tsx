'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { Brain, Apple, Dumbbell, HeartPulse, Loader2, AlertTriangle } from 'lucide-react';

export default function AiCarePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'FOOD' | 'EXERCISE' | 'FIRSTAID'>('FOOD');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string>('');
  const [pregnancyWeek, setPregnancyWeek] = useState<number>(20);

  const fetchSuggestions = async (careType: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careType,
          pregnancyWeek,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuggestions(data.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'FOOD', label: 'Nutrition', icon: Apple, color: 'green' },
    { id: 'EXERCISE', label: 'Exercise', icon: Dumbbell, color: 'blue' },
    { id: 'FIRSTAID', label: 'First Aid', icon: HeartPulse, color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="h-7 w-7 text-purple-600" />
          AI-Assisted Care Module
        </h1>
        <p className="text-gray-500">Get personalized health guidance for pregnancy and postnatal care</p>
      </div>

      {/* Disclaimer */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 font-medium">Important Disclaimer</p>
            <p className="text-sm text-yellow-700">
              This information is for general awareness only and should not replace professional medical advice. 
              Always consult your healthcare provider for personalized guidance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pregnancy Week Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Pregnancy Week:
            </label>
            <input
              type="range"
              min="1"
              max="42"
              value={pregnancyWeek}
              onChange={(e) => setPregnancyWeek(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold text-teal-600 w-16 text-center">
              Week {pregnancyWeek}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSuggestions('');
              }}
              className={activeTab === tab.id ? '' : ''}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Content Area */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'FOOD' && 'Nutrition Guidance'}
            {activeTab === 'EXERCISE' && 'Safe Exercise Recommendations'}
            {activeTab === 'FIRSTAID' && 'Basic First Aid Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!suggestions && !loading && (
            <div className="text-center py-12">
              <div className="mb-4">
                {activeTab === 'FOOD' && <Apple className="h-16 w-16 text-green-200 mx-auto" />}
                {activeTab === 'EXERCISE' && <Dumbbell className="h-16 w-16 text-blue-200 mx-auto" />}
                {activeTab === 'FIRSTAID' && <HeartPulse className="h-16 w-16 text-red-200 mx-auto" />}
              </div>
              <p className="text-gray-500 mb-4">
                {activeTab === 'FOOD' && 'Get personalized nutrition guidance based on your pregnancy stage.'}
                {activeTab === 'EXERCISE' && 'Discover safe exercises suitable for your current trimester.'}
                {activeTab === 'FIRSTAID' && 'Learn basic first aid for common pregnancy and newborn situations.'}
              </p>
              <Button onClick={() => fetchSuggestions(activeTab)}>
                Get {tabs.find(t => t.id === activeTab)?.label} Suggestions
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-teal-600 mx-auto animate-spin mb-4" />
              <p className="text-gray-500">Generating personalized suggestions...</p>
            </div>
          )}

          {suggestions && !loading && (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {suggestions.split('\n').map((line, i) => {
                  if (line.startsWith('##')) {
                    return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">{line.replace('##', '').trim()}</h2>;
                  }
                  if (line.startsWith('###')) {
                    return <h3 key={i} className="text-md font-semibold text-gray-800 mt-3 mb-1">{line.replace('###', '').trim()}</h3>;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.startsWith('- ') || line.startsWith('• ')) {
                    return <li key={i} className="ml-4 list-disc">{line.substring(2)}</li>;
                  }
                  if (line.trim() === '') {
                    return <br key={i} />;
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
              <div className="mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => fetchSuggestions(activeTab)}>
                  Refresh Suggestions
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
