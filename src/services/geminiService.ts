import { FieldProfile, WeatherObservation, FeedbackRecord } from '../types';

export interface AdvisorApiResponse {
  success: boolean;
  advice?: {
    headline: string;
    situationSummary: string;
    topActions: Array<{
      title: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
      dataBasis: string;
    }>;
    postponeActions: string[];
    agronomicExplanation: string;
    uncertainties: string;
    nextCheckTime: string;
  };
  fallback?: boolean;
  message?: string;
}

export const GeminiService = {
  async getFieldAdvice(
    field: FieldProfile,
    weather: WeatherObservation,
    ruleAnalysis: any,
    feedbackHistory: FeedbackRecord[]
  ): Promise<AdvisorApiResponse> {
    try {
      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          weather,
          ruleAnalysis,
          feedbackHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.warn('Backend Gemini API not reachable or errored, using rule engine synthesis:', err.message);
      return {
        success: false,
        fallback: true,
        message: 'Đang dùng bộ phân tích nông học tiêu chuẩn (Quy tắc chuyên gia).',
      };
    }
  },

  async sendChatMessage(
    message: string,
    field: FieldProfile,
    conversationHistory: Array<{ role: 'user' | 'model'; parts: string }>
  ): Promise<string> {
    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          field,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.reply || 'Không nhận được câu trả lời từ AI.';
    } catch (err: any) {
      return `Hiện tại máy chủ AI đang ngoại tuyến. Dựa trên hồ sơ thửa ruộng "${field.name}" (${field.crop.name}, đất ${field.soilType}): Bạn nên kiểm tra ẩm độ thực tế và khơi thông rãnh thoát nước nếu trời mưa ẩm.`;
    }
  },
};
