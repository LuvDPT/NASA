import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!apiKey,
    timestamp: new Date().toISOString(),
    service: 'AgriNASA AI Full-Stack Server',
  });
});

// NASA POWER indicators metadata
app.get('/api/nasa/indicators', (_req: Request, res: Response) => {
  const indicators = [
    { code: 'T2M', name: 'Nhiệt độ trung bình 2m', unit: '°C', desc: 'Đánh giá điều kiện nhiệt độ chung' },
    { code: 'T2M_MIN', name: 'Nhiệt độ tối thiểu', unit: '°C', desc: 'Cảnh báo rét, sương giá, rét hại' },
    { code: 'T2M_MAX', name: 'Nhiệt độ tối đa', unit: '°C', desc: 'Cảnh báo sốc nhiệt, cháy lá, stress nhiệt' },
    { code: 'PRECTOTCORR', name: 'Lượng mưa hiệu chỉnh', unit: 'mm/ngày', desc: 'Đánh giá lượng nước mưa tự nhiên và nhu cầu tưới bổ sung' },
    { code: 'GWETTOP', name: 'Độ ẩm đất tầng mặt', unit: '0-1 (tỷ lệ)', desc: 'Phân tích điều kiện ẩm tầng 0-5cm hạt giống và rễ non' },
    { code: 'GWETROOT', name: 'Độ ẩm đất vùng rễ', unit: '0-1 (tỷ lệ)', desc: 'Trạng thái ẩm vùng rễ cây trồng sâu 0-100cm' },
    { code: 'RH2M', name: 'Độ ẩm tương đối không khí', unit: '%', desc: 'Đánh giá môi trường ẩm, điều kiện phát sinh nấm bệnh' },
    { code: 'ALLSKY_SFC_SW_DWN', name: 'Bức xạ mặt trời bề mặt', unit: 'MJ/m²/ngày', desc: 'Năng lượng quang hợp và bốc thoát hơi nước tiềm năng' },
  ];
  res.json({ indicators, period: '2005-2025 (21 năm)', resolution: '0.5° x 0.5°' });
});

// Gemini AI Advisor endpoint
app.post('/api/gemini/advisor', async (req: Request, res: Response) => {
  try {
    const { field, weather, ruleAnalysis, feedbackHistory } = req.body;

    if (!ai) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Khóa API Gemini chưa được cấu hình. Hệ thống sử dụng Bộ quy tắc nông học chuyên gia để phân tích cục bộ.',
        advice: null,
      });
    }

    const prompt = `
Bạn là Trợ lý AI Canh tác Nông nghiệp Chuyên gia AgriNASA AI, phân tích dữ liệu cho nông dân Việt Nam.
Thông tin thửa ruộng:
- Tên ruộng: ${field?.name || 'Ruộng đang chọn'}
- Địa điểm: ${field?.province}, ${field?.district} (Tọa độ: ${field?.lat}°N, ${field?.lon}°E)
- Ô lưới NASA POWER gần nhất: ${field?.nasaGrid?.lat}°N, ${field?.nasaGrid?.lon}°E (Cách ruộng: ${field?.nasaGrid?.distanceKm} km)
- Cây trồng: ${field?.cropName} (Giống: ${field?.variety || 'Chuẩn'}, Giai đoạn: ${field?.stageName})
- Loại đất: ${field?.soilType} (Đặc tính: ${field?.drainage})
- Nguồn nước: ${field?.waterSource} (${field?.waterNotes || 'Bình thường'})
- Mục tiêu canh tác ưu tiên: ${field?.primaryGoal}

Dữ liệu quan trắc / thời tiết hiện tại:
- Nhiệt độ hiện tại: ${weather?.temp}°C (Thấp nhất: ${weather?.minTemp}°C, Cao nhất: ${weather?.maxTemp}°C)
- Lượng mưa: ${weather?.rain} mm
- Độ ẩm không khí: ${weather?.humidity}%
- Độ ẩm đất vùng rễ (GWETROOT): ${(weather?.gwetroot * 100).toFixed(0)}%
- Độ ẩm tầng mặt (GWETTOP): ${(weather?.gwettop * 100).toFixed(0)}%
- Bức xạ mặt trời: ${weather?.solarRadiation} MJ/m²/ngày

Dữ liệu NASA POWER lịch sử 21 năm (2005-2025) cùng kỳ:
- Nhiệt độ trung bình lịch sử: ${weather?.historicalBaseline?.avgTemp}°C
- Lượng mưa trung bình lịch sử: ${weather?.historicalBaseline?.avgRain} mm
- Khác biệt so với lịch sử: ${weather?.temp - (weather?.historicalBaseline?.avgTemp || 26) > 0 ? '+' : ''}${(weather?.temp - (weather?.historicalBaseline?.avgTemp || 26)).toFixed(1)}°C

Phân tích từ Bộ máy Nông học:
- Tình trạng rủi ro: ${ruleAnalysis?.riskLevel || 'Bình thường'}
- Cảnh báo chính: ${ruleAnalysis?.primaryAlert || 'Theo dõi định kỳ'}
- Hành động đề xuất sơ bộ: ${JSON.stringify(ruleAnalysis?.preliminaryActions || [])}

Lịch sử phản hồi của nông dân đối với thửa ruộng này:
${feedbackHistory?.length ? JSON.stringify(feedbackHistory.slice(-3)) : 'Chưa có phản hồi trước đó'}

Yêu cầu xuất ra định dạng JSON chính xác:
{
  "headline": "Tiêu đề ngắn gọn tình trạng ruộng hôm nay (VD: CẢNH BÁO: Điều kiện lạnh ẩm cần chú ý hoặc THUẬN LỢI: Đẩy mạnh sinh trưởng)",
  "situationSummary": "Mô tả tình trạng 2 câu bằng tiếng Việt dễ hiểu",
  "topActions": [
    {
      "title": "Hành động 1",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "reason": "Lý do dựa trên đất, cây và thời tiết",
      "dataBasis": "Dữ liệu nguồn kích hoạt"
    },
    { "title": "Hành động 2", "priority": "HIGH" | "MEDIUM" | "LOW", "reason": "...", "dataBasis": "..." },
    { "title": "Hành động 3", "priority": "HIGH" | "MEDIUM" | "LOW", "reason": "...", "dataBasis": "..." }
  ],
  "postponeActions": [
    "Hành động nên tạm hoãn 1 và lý do",
    "Hành động nên tạm hoãn 2 và lý do"
  ],
  "agronomicExplanation": "Giải thích chi tiết vì sao AI đưa ra các khuyến nghị này dựa trên sinh lý cây trồng, ẩm độ đất và dữ liệu NASA",
  "uncertainties": "Những thông tin người nông dân cần tự kiểm tra thực tế bằng mắt (vì vệ tinh/mô hình không thể đo trực tiếp tại gốc)",
  "nextCheckTime": "Gợi ý thời điểm kiểm tra ruộng tiếp theo (VD: Sáng sớm mai lúc 06:30)"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là chuyên gia nông học Việt Nam thuộc hệ thống AgriNASA AI. Trả lời thuần định dạng JSON chuẩn. Không dùng markdown code fences.',
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      advice: parsedData,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini Advisor Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi gọi Gemini AI',
    });
  }
});

// Gemini Q&A Chat endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, field, conversationHistory } = req.body;

    if (!ai) {
      return res.status(200).json({
        success: false,
        reply: 'Khóa API Gemini chưa được cấu hình trong Secrets. Vui lòng thêm GEMINI_API_KEY để kích hoạt tính năng trò chuyện AI trực tiếp.',
      });
    }

    const systemPrompt = `
Bạn là AgriNASA AI - Trợ lý nông nghiệp thông minh cá nhân hóa của người nông dân Việt Nam.
Thông tin thửa ruộng hiện tại:
- Tên: ${field?.name || 'Thửa ruộng của bạn'}
- Vị trí: ${field?.province || 'Việt Nam'} (Ô lưới NASA: ${field?.nasaGrid?.lat}°N, ${field?.nasaGrid?.lon}°E)
- Cây trồng: ${field?.cropName || 'Cây trồng'} (Giống: ${field?.variety || 'Thông dụng'}, Giai đoạn: ${field?.stageName || 'Sinh trưởng'})
- Loại đất: ${field?.soilType || 'Đất thịt'}
- Nguồn nước: ${field?.waterSource || 'Nước mương'}

Nguyên tắc trả lời:
1. Luôn nói tiếng Việt gần gũi, thực tế, dễ hiểu cho người làm nông.
2. Dựa trên thông tin giống cây, loại đất và thời tiết cụ thể của thửa ruộng, không đưa lời khuyên chung chung.
3. Không tự sáng tác số đo thuốc sâu hay liều lượng độc hại nếu thiếu kiểm nghiệm cụ thể; khuyên nông dân kiểm tra thực địa trước khi phun tưới.
4. Trình bày rõ ràng, dùng gạch đầu dòng ngắn gọn.
`;

    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction: systemPrompt,
      },
    });

    // Send previous history if any
    if (Array.isArray(conversationHistory)) {
      for (const item of conversationHistory.slice(-4)) {
        if (item.role === 'user') {
          // ignore or pre-feed
        }
      }
    }

    const response = await chat.sendMessage({
      message: message || 'Xin chào, ruộng của tôi hôm nay cần chú ý gì?',
    });

    res.json({
      success: true,
      reply: response.text,
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      success: false,
      reply: 'Rất tiếc, đã có lỗi kết nối tới trợ lý AI. Vui lòng thử lại sau giây lát.',
    });
  }
});

// ==============================================================================
// Centralized NASA Data Warehouse & Supabase Sync Endpoints
// ==============================================================================

import {
  getCentralDataStatus,
  executeNasaPowerSync,
  toggleAutoSync,
  previewUploadedCsv,
  commitImportedData,
  rollbackDataVersion,
  getSyncLogs,
  getDataImports,
} from './server/nasaSyncManager.ts';

// Public data status for dashboard
app.get('/api/data-status', async (_req: Request, res: Response) => {
  try {
    const status = await getCentralDataStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin status
app.get('/api/admin/status', async (_req: Request, res: Response) => {
  try {
    const status = await getCentralDataStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger NASA POWER Daily API sync
app.post('/api/admin/sync', async (req: Request, res: Response) => {
  try {
    const { cellIds } = req.body;
    const result = await executeNasaPowerSync(cellIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi đồng bộ NASA POWER' });
  }
});

// Toggle auto daily sync
app.post('/api/admin/toggle-auto-sync', (req: Request, res: Response) => {
  const { enabled } = req.body;
  const newState = toggleAutoSync(!!enabled);
  res.json({ autoSyncEnabled: newState });
});

// Preview uploaded CSV/Excel
app.post('/api/admin/preview-file', (req: Request, res: Response) => {
  try {
    const { fileName, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Nội dung tệp rỗng' });
    }
    const preview = previewUploadedCsv(fileName || 'upload.csv', content);
    res.json(preview);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi kiểm tra tệp' });
  }
});

// Commit imported data
app.post('/api/admin/import-data', async (req: Request, res: Response) => {
  try {
    const { preview, rawContent } = req.body;
    if (!preview || !rawContent) {
      return res.status(400).json({ error: 'Dữ liệu thiếu' });
    }
    const record = await commitImportedData(preview, rawContent);
    res.json({ success: true, importRecord: record });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi nhập dữ liệu' });
  }
});

// Get sync logs & data imports
app.get('/api/admin/sync-logs', (_req: Request, res: Response) => {
  res.json({
    logs: getSyncLogs(),
    imports: getDataImports(),
  });
});

// Rollback import version
app.post('/api/admin/rollback', (req: Request, res: Response) => {
  try {
    const { version } = req.body;
    if (!version) {
      return res.status(400).json({ error: 'Thiếu mã phiên bản cần rollback' });
    }
    const result = rollbackDataVersion(version);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi khôi phục phiên bản' });
  }
});

// Serve frontend in dev via Vite middlewares, or static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`AgriNASA AI Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
