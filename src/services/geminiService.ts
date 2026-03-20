import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";

export const generateTripItinerary = async (params: {
  source: string;
  destination: string;
  duration: number;
  budget: number;
  travelStyle: string;
}) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    Act as a local travel expert. Plan a ${params.duration}-day trip from ${params.source} to ${params.destination}.
    Travel Style: ${params.travelStyle} (e.g., bike trip, train journey).
    Budget: ₹${params.budget}.
    Duration: ${params.duration} days.

    Provide a detailed itinerary in JSON format including:
    - dayWiseItinerary: Array of objects with day and activities.
    - scenicStops: Array of strings (hidden gems, viewpoints).
    - foodRecommendations: Array of strings (local delicacies).
    - estimatedCostBreakdown: Object with fuel/transport, hotel, food, and total.
    - bestTimeToVisit: String.
    - travelTips: Array of strings.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dayWiseItinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                activities: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          scenicStops: { type: Type.ARRAY, items: { type: Type.STRING } },
          foodRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          estimatedCostBreakdown: {
            type: Type.OBJECT,
            properties: {
              transport: { type: Type.NUMBER },
              hotel: { type: Type.NUMBER },
              food: { type: Type.NUMBER },
              total: { type: Type.NUMBER }
            }
          },
          bestTimeToVisit: { type: Type.STRING },
          travelTips: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateBudgetInsights = async (params: {
  totalBudget: number;
  totalSpent: number;
  expenses: any[];
}) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    Act as a financial travel advisor. A traveler has a total budget of ₹${params.totalBudget} and has spent ₹${params.totalSpent} so far.
    Expenses: ${JSON.stringify(params.expenses)}

    Provide smart AI insights in JSON format including:
    - status: String (e.g., "On Track", "Overspending", "Critical").
    - suggestions: Array of strings (budget optimization tips).
    - prediction: String (predict total trip cost based on current spending).
    - warning: String (if any specific category is too high).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          prediction: { type: Type.STRING },
          warning: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
