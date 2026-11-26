// ตั้งค่า Firebase เพื่อให้ทุกคนแก้ไขพร้อมกันแบบเรียลไทม์ (ดู README.md)
// ถ้าปล่อยเป็น null เว็บจะทำงานแบบ "โหมดในเครื่อง" (ข้อมูลอยู่ในเบราว์เซอร์ของแต่ละคน)
//
// ตัวอย่าง:
// window.NAN_FIREBASE_CONFIG = {
//   apiKey: "AIza...",
//   authDomain: "nannetwork-xxxx.firebaseapp.com",
//   projectId: "nannetwork-xxxx",
//   appId: "1:1234567890:web:abcdef"
// };
window.NAN_FIREBASE_CONFIG = null;

// แบบสอบถาม Google Form แบบเรียลไทม์ (ดู README.md หัวข้อ "แบบสอบถามน่านฟอรั่ม")
// ใส่ Web app URL ของ Apps Script (ลงท้าย /exec) แล้วหน้าเว็บจะสร้างโปรเจค "น่านฟอรั่ม – ผลแบบสอบถาม" และดึงใหม่ทุก 30 วินาที
// ทดสอบโดยไม่แก้ไฟล์นี้ได้ด้วย  https://tenrm.github.io/NanNetwork-v2/?feed=<Web app URL>#p-nan-forum-2569
window.NAN_FORM_FEED = {
  url: 'https://script.google.com/macros/s/AKfycbzq6b-DAoufGz0ZhsBaxdYWUtxcmA7jFSHpYGsbF3kUo7CTDRZx-wvQzhMIdwTscmQs/exec',
  formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScGl_0tCfkjyVhqyDfckdLowlChYdiWdEYdJvPEjZdQN7NqtQ/viewform',
  projectId: 'nan-forum-2569',
  refreshSec: 30
};
// ตัวอย่าง: window.NAN_FORM_FEED = { url: 'https://script.google.com/macros/s/XXXX/exec', projectId: 'nan-forum-2569', refreshSec: 30 };
