import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get AI care suggestions
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { careType, pregnancyWeek, query, childAgeMonths } = body;

    let systemPrompt = '';
    let userPrompt = '';

    switch (careType) {
      case 'FOOD':
        systemPrompt = `You are a helpful maternal health assistant providing general nutrition guidance. 
        You provide GENERAL AWARENESS information only, NOT medical prescriptions.
        Always include a disclaimer that this is for informational purposes and they should consult their healthcare provider.
        Respond in a friendly, supportive tone.`;
        
        if (pregnancyWeek) {
          userPrompt = `I am ${pregnancyWeek} weeks pregnant. Please provide general nutrition suggestions for this stage of pregnancy. Include foods to eat and foods to avoid.`;
        } else if (childAgeMonths !== undefined) {
          userPrompt = `I am a postnatal mother with a ${childAgeMonths} month old baby. Please provide general nutrition suggestions for postpartum recovery and breastfeeding support.`;
        } else {
          userPrompt = query || 'Please provide general nutrition guidance for pregnant mothers.';
        }
        break;

      case 'EXERCISE':
        systemPrompt = `You are a helpful maternal health assistant providing general exercise and physical activity guidance.
        You provide GENERAL AWARENESS information only for low-risk exercises suitable for pregnancy and postnatal recovery.
        Always include appropriate safety warnings and a disclaimer to consult their healthcare provider before starting any exercise program.
        Respond in a friendly, supportive tone.`;
        
        if (pregnancyWeek) {
          const trimester = pregnancyWeek <= 12 ? 'first' : pregnancyWeek <= 26 ? 'second' : 'third';
          userPrompt = `I am in my ${trimester} trimester (${pregnancyWeek} weeks). Please suggest safe, low-impact exercises suitable for this stage of pregnancy.`;
        } else if (childAgeMonths !== undefined) {
          userPrompt = `I am ${childAgeMonths} months postpartum. Please suggest safe exercises for postnatal recovery.`;
        } else {
          userPrompt = query || 'Please provide general exercise guidance for pregnant mothers.';
        }
        break;

      case 'FIRSTAID':
        systemPrompt = `You are a helpful maternal health assistant providing basic first aid information for common non-emergency maternal and newborn situations.
        You provide GENERAL AWARENESS information only.
        Always advise seeking professional medical help for emergencies or when in doubt.
        Include clear warnings about when to seek immediate medical attention.
        Respond in a clear, calm, and supportive tone.`;
        
        userPrompt = query || 'Please provide basic first aid information for common non-emergency situations during pregnancy and for newborns.';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid care type' },
          { status: 400 }
        );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Return mock data if no API key
      const mockSuggestions = getMockSuggestions(careType, pregnancyWeek);
      
      // Save record
      if (session.user.motherId) {
        await prisma.aICareRecord.create({
          data: {
            motherId: session.user.motherId,
            pregnancyWeek,
            careType,
            query: userPrompt,
            suggestions: mockSuggestions,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          suggestions: mockSuggestions,
          disclaimer: 'This information is for general awareness only. Always consult your healthcare provider for personalized medical advice.',
        },
      });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const suggestions = completion.choices[0]?.message?.content || 'Unable to generate suggestions at this time.';

    // Save AI care record
    if (session.user.motherId) {
      await prisma.aICareRecord.create({
        data: {
          motherId: session.user.motherId,
          pregnancyWeek,
          careType,
          query: userPrompt,
          suggestions,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        disclaimer: 'This information is for general awareness only. Always consult your healthcare provider for personalized medical advice.',
      },
    });
  } catch (error) {
    console.error('AI care error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Get previous AI care records
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const careType = searchParams.get('careType');

    const where: any = {};

    if (session.user.motherId) {
      where.motherId = session.user.motherId;
    }

    if (careType) {
      where.careType = careType;
    }

    const records = await prisma.aICareRecord.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('Get AI care records error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}

function getMockSuggestions(careType: string, pregnancyWeek?: number): string {
  switch (careType) {
    case 'FOOD':
      return `## Nutrition Suggestions for ${pregnancyWeek ? `Week ${pregnancyWeek}` : 'Pregnancy'}

### Recommended Foods:
- **Leafy greens** (spinach, kale) - Rich in folate
- **Lean proteins** (fish, chicken, eggs) - Essential for baby's growth
- **Whole grains** (brown rice, oats) - Provides energy and fiber
- **Dairy products** (milk, yogurt) - Calcium for bone development
- **Fruits** (oranges, berries) - Vitamins and antioxidants

### Foods to Limit:
- Raw or undercooked fish and meat
- High-mercury fish
- Unpasteurized dairy
- Excessive caffeine (limit to 200mg/day)
- Alcohol

### Hydration:
Aim for 8-10 glasses of water daily.

**Disclaimer:** This is general guidance. Consult your healthcare provider for personalized dietary advice.`;

    case 'EXERCISE':
      return `## Safe Exercise Suggestions for ${pregnancyWeek ? `Week ${pregnancyWeek}` : 'Pregnancy'}

### Recommended Activities:
- **Walking** - 30 minutes daily at a comfortable pace
- **Swimming** - Low-impact, full-body workout
- **Prenatal Yoga** - Improves flexibility and relaxation
- **Light stretching** - Reduces muscle tension
- **Pelvic floor exercises** - Kegel exercises for core strength

### Safety Guidelines:
- Stay hydrated during exercise
- Avoid exercises lying flat on your back after first trimester
- Stop if you feel dizzy, short of breath, or experience pain
- Wear supportive clothing and proper footwear
- Exercise in cool, well-ventilated areas

### Activities to Avoid:
- Contact sports
- Activities with fall risk
- High-intensity workouts
- Hot yoga or hot tubs

**Disclaimer:** Always consult your healthcare provider before starting any exercise program during pregnancy.`;

    case 'FIRSTAID':
      return `## Basic First Aid Information for Mothers and Newborns

### Common Non-Emergency Situations:

**Morning Sickness:**
- Eat small, frequent meals
- Stay hydrated with small sips
- Try ginger tea or crackers
- Rest when needed

**Minor Cuts/Scrapes:**
- Clean with clean water
- Apply gentle pressure to stop bleeding
- Keep the area clean and dry

**Mild Fever in Newborns:**
- Keep baby comfortable
- Ensure adequate feeding
- Use light clothing

### When to Seek Immediate Medical Help:
- Heavy bleeding during pregnancy
- Severe abdominal pain
- High fever (above 100.4°F/38°C)
- Signs of dehydration
- Reduced baby movements
- Newborn fever above 100.4°F/38°C
- Difficulty breathing

**IMPORTANT:** This is general information only. In any emergency or if you're unsure, always seek immediate medical attention or call emergency services.`;

    default:
      return 'Please select a care type for suggestions.';
  }
}
