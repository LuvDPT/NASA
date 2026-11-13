import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Load Firebase client config to verify admin ID tokens server-side
let firebaseApiKey = '';
let firebaseProjectId = '';
let firestoreDatabaseId = '(default)';
try {
  const fbConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(fbConfigPath)) {
    const fbJson = JSON.parse(fs.readFileSync(fbConfigPath, 'utf-8'));
    firebaseApiKey = fbJson.apiKey || '';
    firebaseProjectId = fbJson.projectId || '';
    firestoreDatabaseId = fbJson.firestoreDatabaseId || '(default)';
  }
} catch {
  firebaseApiKey = '';
}
const ADMIN_EMAIL = 'fss01211cg@gmail.com';

async function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token || !firebaseApiKey) {
      return res.status(401).json({ error: 'Yêu cầu đăng nhập tài khoản Quản trị viên.' });
    }
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Phiên đăng nhập quản trị không hợp lệ.' });
    }
    const verifyJson = (await verifyRes.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean; localId?: string }>;
    };
    const matchedUser = verifyJson.users?.[0];
    if (!matchedUser || !matchedUser.emailVerified) {
      return res.status(403).json({ error: 'Tài khoản quản trị cần được xác thực email.' });
    }

    const isBootstrapAdmin =
      matchedUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (isBootstrapAdmin) {
      return next();
    }

    // Check if user was promoted to Admin in Firestore /admins/{uid}
    if (firebaseProjectId && matchedUser.localId) {
      const adminDocUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/${firestoreDatabaseId}/documents/admins/${matchedUser.localId}`;
      const adminDocRes = await fetch(adminDocUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adminDocRes.ok) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền truy cập chức năng này.' });
  } catch {
    return res.status(401).json({ error: 'Không thể xác thực quyền quản trị.' });
  }
}

// Initialize GoogleGenAI server-side dynamically with telemetry header
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '').toLowerCase();
      const status = err?.status || err?.code;
      const isNonRetryable =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        msg.includes('api_key_invalid') ||
        msg.includes('permission_denied');
      if (isNonRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 450 * attempt));
    }
  }
  throw lastError;
}

function extractGeminiText(response: any): string {
  if (typeof response?.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const joined = parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();
    if (joined) return joined;
  }
  return '';
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY?.trim(),
    timestamp: new Date().toISOString(),
    service: 'CropCast Full-Stack Server',
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

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Khóa API Gemini chưa được cấu hình. Hệ thống sử dụng Bộ quy tắc nông học chuyên gia để phân tích cục bộ.',
        advice: null,
      });
    }

    const cropName = field?.crop?.name || field?.cropName || 'Cây trồng';
    const variety = field?.crop?.variety || field?.variety || 'Chuẩn';
    const stageName = field?.crop?.currentStage || field?.stageName || 'Sinh trưởng';
    const waterSrc = typeof field?.waterSource === 'string' ? field.waterSource : field?.waterSource?.type || 'Nước kênh/ao';
    const waterNotes = field?.waterSource?.notes || field?.waterNotes || 'Bình thường';

    const prompt = `
Bạn là Trợ lý AI Canh tác Nông nghiệp Chuyên gia CropCast, phân tích dữ liệu cho nông dân Việt Nam.
Thông tin thửa ruộng:
- Tên ruộng: ${field?.name || 'Ruộng đang chọn'}
- Địa điểm: ${field?.province}, ${field?.district} (Tọa độ: ${field?.lat}°N, ${field?.lon}°E)
- Ô lưới NASA POWER gần nhất: ${field?.nasaGrid?.lat}°N, ${field?.nasaGrid?.lon}°E (Cách ruộng: ${field?.nasaGrid?.distanceKm} km)
- Cây trồng: ${cropName} (Giống: ${variety}, Giai đoạn: ${stageName})
- Loại đất: ${field?.soilType} (Đặc tính: ${field?.soilCharacteristics?.drainage || field?.drainage || 'trung bình'})
- Nguồn nước: ${waterSrc} (${waterNotes})
- Mục tiêu canh tác ưu tiên: ${field?.primaryGoal}

Dữ liệu quan trắc / thời tiết hiện tại:
- Nhiệt độ hiện tại: ${weather?.temp}°C (Thấp nhất: ${weather?.minTemp}°C, Cao nhất: ${weather?.maxTemp}°C)
- Lượng mưa: ${weather?.rain} mm
- Độ ẩm không khí: ${weather?.humidity}%
- Độ ẩm đất vùng rễ (GWETROOT): ${((weather?.gwetroot || 0.5) * 100).toFixed(0)}%
- Độ ẩm tầng mặt (GWETTOP): ${((weather?.gwettop || 0.5) * 100).toFixed(0)}%
- Bức xạ mặt trời: ${weather?.solarRadiation} MJ/m²/ngày

Dữ liệu NASA POWER lịch sử 21 năm (2005-2025) cùng kỳ:
- Nhiệt độ trung bình lịch sử: ${weather?.historicalBaseline?.avgTemp}°C
- Lượng mưa trung bình lịch sử: ${weather?.historicalBaseline?.avgRain} mm
- Khác biệt so với lịch sử: ${(weather?.temp || 26) - (weather?.historicalBaseline?.avgTemp || 26) > 0 ? '+' : ''}${((weather?.temp || 26) - (weather?.historicalBaseline?.avgTemp || 26)).toFixed(1)}°C

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

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: 'Bạn là chuyên gia nông học Việt Nam thuộc hệ thống CropCast. Trả lời thuần định dạng JSON chuẩn. Không dùng markdown code fences.',
          responseMimeType: 'application/json',
        },
      })
    );

    const text = extractGeminiText(response) || '{}';
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
      source: 'gemini-4-hydrogen',
    });
  } catch (error: any) {
    console.error('Gemini Advisor Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi gọi Gemini AI',
    });
  }
});

// Gemini Rotation Rethink endpoint: farmer rejects current best strategy with a reason -> AI decides a better one
app.post('/api/gemini/rotation-rethink', async (req: Request, res: Response) => {
  try {
    const {
      field,
      weather,
      rejectedStrategy,
      rejectionReason,
      previouslyRejectedTitles,
      priorities,
      constraints,
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        fallback: true,
        strategy: null,
      });
    }

    const prompt = `
Bạn là chuyên gia nông học Việt Nam của hệ thống CropCast.
Nông dân đang xem xét chiến lược luân canh tối ưu cho thửa ruộng của họ, nhưng họ ĐÃ TỪ CHỐI phương án vừa đề xuất vì lý do thực tế dưới đây. Hãy đề xuất MỘT (1) chiến lược luân canh thay thế TỐT HƠN, giải quyết triệt để lý do từ chối của nông dân.

Thông tin thửa ruộng:
- Tên ruộng: ${field?.name}
- Địa phương: ${field?.province}, ${field?.district} (${field?.lat}°B, ${field?.lon}°Đ)
- Loại đất: ${field?.soilType}, Thoát nước: ${field?.soilCharacteristics?.drainage}
- Cây hiện tại: ${field?.crop?.name} (Họ: ${field?.crop?.seedFamily || 'chưa rõ'}, Giống: ${field?.crop?.variety})
- Nguồn nước: ${field?.waterSource?.type} (${constraints?.waterAvailability || 'seasonal_limited'})
- Thiết bị/lao động: ${constraints?.equipmentAccess || 'basic_manual'}
- Đầu ra mong muốn: ${constraints?.marketPreference || 'mixed_family'}
- Ưu tiên nông dân: ${JSON.stringify(priorities || [])}
- Khí hậu hiện tại: Nhiệt độ ${weather?.temp}°C, Ẩm rễ ${Math.round((weather?.gwetroot || 0.5) * 100)}%, Độ ẩm KK ${weather?.humidity}%

Chiến lược vừa bị từ chối:
- Tên phương án: ${rejectedStrategy?.title}
- Cây đề xuất trước đó: ${rejectedStrategy?.nextCropName}
- Các phương án đã bị bỏ qua trước đó (KHÔNG lặp lại): ${JSON.stringify(previouslyRejectedTitles || [])}

LÝ DO NÔNG DÂN KHÔNG ÁP DỤNG ĐƯỢC PHƯƠNG ÁN TRƯỚC:
"${rejectionReason}"

Hãy trả về ĐÚNG 1 JSON Object theo cấu trúc sau (bằng tiếng Việt dễ hiểu cho nông dân, không dùng mã kỹ thuật khó hiểu):
{
  "title": "Tên chiến lược luân canh mới tốt hơn (ngắn gọn, rõ cây trồng mới)",
  "sequenceSummary": "Chuỗi vụ: Cây hiện tại → Cây luân canh mới → Vụ kế tiếp",
  "nextCropFamily": "poaceae" | "fabaceae" | "brassicaceae" | "solanaceae" | "cucurbitaceae" | "other_perennial",
  "nextCropName": "Tên loại cây trồng cụ thể phù hợp lý do của nông dân",
  "suitabilityScore": số nguyên từ 78 đến 98,
  "whySuggested": "Giải thích 2-3 câu vì sao phương án mới này giải quyết đúng lý do nông dân nêu ra và hợp với đất/thời tiết",
  "supportingEvidence": ["Bằng chứng 1 từ đất/khí hậu", "Bằng chứng 2", "Bằng chứng 3"],
  "benefits": {
    "nutrientCycling": "Tác động dinh dưỡng đất",
    "waterDemand": "Nhu cầu nước tưới",
    "erosionAndOrganicMatter": "Chống xói mòn và mùn đất",
    "pestCycleDisruption": "Khả năng ngắt sâu bệnh",
    "forageAndIncome": "Đầu ra thị trường / chăn nuôi / thu nhập"
  },
  "informationGaps": ["Khoảng trống thông tin cần lưu ý 1", "Khoảng trống 2"],
  "localReviewRisks": ["Rủi ro cần kiểm tra ngoài ruộng / hỏi khuyến nông 1", "Rủi ro 2"]
}
`;

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là chuyên gia quy hoạch luân canh nông nghiệp CropCast. Trả về đúng JSON hợp lệ, không markdown.',
          responseMimeType: 'application/json',
        },
      })
    );

    const text = extractGeminiText(response) || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const validFamilies = ['poaceae', 'fabaceae', 'brassicaceae', 'solanaceae', 'cucurbitaceae', 'other_perennial'];
    const safeFamily = validFamilies.includes(parsed.nextCropFamily)
      ? parsed.nextCropFamily
      : 'other_perennial';

    res.json({
      success: true,
      source: 'gemini-4-hydrogen',
      strategy: {
        id: `rot-ai-${Date.now()}`,
        isCurrentBaseline: false,
        title: parsed.title || `Luân canh điều chỉnh: ${parsed.nextCropName || 'Cây ngắn ngày phù hợp'}`,
        sequenceSummary: parsed.sequenceSummary || `${field?.crop?.name} → ${parsed.nextCropName}`,
        nextCropFamily: safeFamily,
        nextCropName: parsed.nextCropName || 'Cây luân canh phù hợp',
        suitabilityScore: Math.min(98, Math.max(75, Number(parsed.suitabilityScore) || 88)),
        whySuggested: parsed.whySuggested || 'Đã điều chỉnh theo phản hồi thực tế của bạn.',
        supportingEvidence: Array.isArray(parsed.supportingEvidence) ? parsed.supportingEvidence : [],
        benefits: parsed.benefits || {
          nutrientCycling: 'Cân bằng dinh dưỡng đất giữa các vụ.',
          waterDemand: 'Phù hợp nguồn nước hiện có.',
          erosionAndOrganicMatter: 'Che phủ đất và bổ sung hữu cơ.',
          pestCycleDisruption: 'Ngắt chu kỳ sâu bệnh vụ cũ.',
          forageAndIncome: 'Phù hợp điều kiện tiêu thụ của hộ gia đình.',
        },
        informationGaps: Array.isArray(parsed.informationGaps) ? parsed.informationGaps : [],
        localReviewRisks: Array.isArray(parsed.localReviewRisks) ? parsed.localReviewRisks : [],
        alignedPriorities: Array.isArray(priorities) ? priorities : [],
      },
    });
  } catch (error: any) {
    console.error('Gemini Rotation Rethink Error:', error);
    res.status(200).json({
      success: false,
      fallback: true,
      strategy: null,
    });
  }
});

// Gemini Q&A Chat endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, field, weather, conversationHistory } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        fallback: true,
        errorCode: 'MISSING_API_KEY',
        reply:
          'Trợ lý AI hiện chưa được gắn khóa kết nối GEMINI_API_KEY trên máy chủ. Bạn vẫn có thể xem khuyến nghị tự động theo dữ liệu khí hậu ở mục Tổng quan và Luân canh & Đất.',
      });
    }

    const cropName = field?.crop?.name || field?.cropName || 'Cây trồng';
    const variety = field?.crop?.variety || field?.variety || 'Thông dụng';
    const stageName = field?.crop?.currentStage || field?.stageName || 'Đang sinh trưởng';
    const waterSrc =
      typeof field?.waterSource === 'string'
        ? field.waterSource
        : field?.waterSource?.type || 'Nước kênh/ao';

    const weatherSummary = weather
      ? `Nhiệt độ ${weather.temp}°C (thấp nhất ${weather.minTemp}°C, cao nhất ${weather.maxTemp}°C), lượng mưa ${weather.rain} mm, ẩm không khí ${weather.humidity}%, ẩm đất vùng rễ ${Math.round((weather.gwetroot || 0.5) * 100)}%, bức xạ ${weather.solarRadiation} MJ/m²/ngày.`
      : 'Chưa có số liệu thời tiết tức thời.';

    const systemPrompt = `
Bạn là CropCast - Trợ lý nông nghiệp thông minh cá nhân hóa của người nông dân Việt Nam.
Thông tin thửa ruộng hiện tại:
- Tên ruộng: ${field?.name || 'Thửa ruộng của bạn'}
- Vị trí: ${field?.province || 'Việt Nam'}, ${field?.district || ''} (Điểm khí hậu: ${field?.nasaGrid?.lat ?? field?.lat}°N, ${field?.nasaGrid?.lon ?? field?.lon}°E)
- Cây trồng: ${cropName} (Giống: ${variety}, Giai đoạn: ${stageName})
- Loại đất: ${field?.soilType || 'Đất thịt'} (Thoát nước: ${field?.soilCharacteristics?.drainage || 'trung bình'})
- Nguồn nước: ${waterSrc}
- Thời tiết hiện tại: ${weatherSummary}

Nguyên tắc trả lời:
1. Luôn nói tiếng Việt thuần, gần gũi, thực tế, dễ hiểu cho người làm nông (tránh dùng từ tiếng Anh chuyên ngành khó hiểu).
2. Dựa trên thông tin giống cây, loại đất, nguồn nước và thời tiết cụ thể của thửa ruộng, không đưa lời khuyên chung chung.
3. Không tự sáng tác liều lượng thuốc bảo vệ thực vật độc hại nếu thiếu kiểm nghiệm cụ thể; khuyên nông dân kiểm tra thực địa trước khi phun tưới.
4. Trình bày rõ ràng, dùng gạch đầu dòng ngắn gọn, súc tích.
`;

    // Format valid alternating history starting from the first user turn
    const sanitizedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(conversationHistory)) {
      const recent = conversationHistory.slice(-8);
      for (const item of recent) {
        const text = typeof item?.parts === 'string' ? item.parts.trim() : '';
        if (!text) continue;
        const role = item.role === 'user' ? 'user' : 'model';
        // Gemini chat history MUST start with 'user' and alternate roles cleanly
        if (sanitizedHistory.length === 0 && role !== 'user') continue;
        const lastRole = sanitizedHistory[sanitizedHistory.length - 1]?.role;
        if (lastRole === role) {
          sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += `\n${text}`;
        } else {
          sanitizedHistory.push({ role, parts: [{ text }] });
        }
      }
      // Ensure history ends on 'model' before calling sendMessage (or drop trailing user)
      if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
        sanitizedHistory.pop();
      }
    }

    const promptText = userMessage || 'Xin chào, ruộng của tôi hôm nay cần chú ý gì?';

    const replyText = await withGeminiRetry(async () => {
      const chat = ai.chats.create({
        model: 'gemini-4-hydrogen',
        history: sanitizedHistory,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const response = await chat.sendMessage({
        message: promptText,
      });
      const extracted = extractGeminiText(response);
      if (extracted) return extracted;

      // Fallback single-turn generateContent if chat response returned empty
      const directRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          systemInstruction: systemPrompt,
        },
      });
      const directText = extractGeminiText(directRes);
      if (!directText) {
        throw new Error('EMPTY_MODEL_RESPONSE');
      }
      return directText;
    }, 3);

    res.json({
      success: true,
      reply: replyText,
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error?.status || error?.code, error?.message || error);
    const status = error?.status || error?.code;
    const msg = String(error?.message || '').toLowerCase();
    let userFriendlyError = 'Máy chủ AI đang bận hoặc tạm gián đoạn kết nối. Vui lòng thử gửi lại sau vài giây.';
    if (status === 429 || msg.includes('resource_exhausted') || msg.includes('quota')) {
      userFriendlyError = 'Hệ thống AI đang quá tải lượt hỏi tạm thời (vượt hạn mức phút). Vui lòng đợi 10–15 giây rồi hỏi lại.';
    } else if (status === 400 || status === 403 || msg.includes('api_key')) {
      userFriendlyError = 'Khóa kết nối Gemini AI chưa hợp lệ hoặc đã hết hạn. Quản trị viên cần kiểm tra lại GEMINI_API_KEY trong phần Secrets.';
    }
    res.status(503).json({
      success: false,
      errorCode: status || 'GEMINI_ERROR',
      reply: userFriendlyError,
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
  previewBatchCsvFiles,
  commitImportedData,
  commitBatchCsvFiles,
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

// Protect all /api/admin/* endpoints strictly for verified admin account
app.use('/api/admin', requireAdminMiddleware);

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

// Preview multiple CSV files across multiple folders
app.post('/api/admin/preview-batch', (req: Request, res: Response) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Chưa có tệp CSV nào trong danh sách' });
    }
    const batchResult = previewBatchCsvFiles(files);
    res.json(batchResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi kiểm tra hàng loạt tệp CSV' });
  }
});

// Commit multiple CSV files across multiple folders
app.post('/api/admin/import-batch', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Chưa có tệp CSV nào để nhập' });
    }
    const result = await commitBatchCsvFiles(files);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi nhập dữ liệu hàng loạt' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CropCast Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
