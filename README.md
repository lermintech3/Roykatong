# ลอยกระทงออนไลน์

เว็บลอยกระทงแบบโต้ตอบได้ ทุกคนที่เปิดเว็บจะเห็นกระทงของกันและกันลอยอยู่ในแม่น้ำเดียวกัน

- ฉากแม่น้ำยามค่ำคืนวาดด้วย Canvas: จันทร์เต็มดวงและเงาบนผิวน้ำ ปรางค์และศาลาริมฝั่งเปิดไฟสีทอง โคมลอย และพลุ
- ประดิษฐ์กระทงเอง 4 แบบ ดอกไม้ 5 ชนิด และเทียน 3 สี แล้วจุดเทียน ตั้งจิตอธิษฐาน และปล่อยลงน้ำ
- แตะกระทงที่ลอยอยู่เพื่ออ่านคำอธิษฐานของคนอื่น (หน้าเว็บดึงกระทงใหม่ทุก 15 วินาที)
- เสียงบรรยากาศ (เสียงน้ำและระฆัง) และหน้าความหมายของลอยกระทง

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บทั้งหมด |
| `functions/api/krathongs.js` | API บน Cloudflare Pages Functions: `GET` ดึงกระทงล่าสุด 60 กระทง, `POST` ลอยกระทงใหม่ |

ข้อมูลเก็บใน Cloudflare D1 โดยตารางจะถูกสร้างให้อัตโนมัติในการเรียกครั้งแรก
แต่ละ IP ลอยได้ไม่เกิน 5 กระทงต่อ 10 นาที และเก็บ IP แบบเข้ารหัสทางเดียว (hash) ไม่เก็บ IP จริง

## ติดตั้งบน Cloudflare (ฟรี)

1. **สร้างฐานข้อมูล:** dash.cloudflare.com → Storage & Databases → D1 SQL database → Create → ตั้งชื่อ `loykrathong`
2. **สร้างเว็บ:** Workers & Pages → Create → แท็บ Pages → Connect to Git → เลือก repo `Roykatong`
   - Framework preset: `None`
   - Build command: เว้นว่าง
   - Build output directory: `/`
   - กด Save and Deploy
3. **ผูกฐานข้อมูล:** เข้าโปรเจกต์ Pages → Settings → Bindings → Add → D1 database
   - Variable name: `DB` (ตัวพิมพ์ใหญ่)
   - D1 database: `loykrathong`
4. **Deploy ใหม่** เพื่อให้การผูกมีผล: แท็บ Deployments → ที่ deployment ล่าสุด กด ⋯ → Retry deployment
5. เปิดลิงก์ `https://<ชื่อโปรเจกต์>.pages.dev` ได้เลย

หลังจากนี้ทุกครั้งที่ push ขึ้น `main` ระบบจะ deploy ให้อัตโนมัติ

## ดูแลคำอธิษฐาน

ซ่อนกระทงที่ไม่เหมาะสมได้ที่ D1 → `loykrathong` → Console เช่น

```sql
-- ดูล่าสุด
SELECT id, n, w, datetime(t/1000, 'unixepoch', '+7 hours') AS เวลา FROM krathongs ORDER BY t DESC LIMIT 50;
-- ซ่อนกระทง
UPDATE krathongs SET hidden = 1 WHERE id = 123;
```

## เปิดจากที่อื่น

ถ้าเปิดจากไฟล์ในเครื่องหรือ GitHub Pages (ซึ่งไม่มี API) หน้าเว็บจะทำงานแบบส่วนตัว
กระทงจะลอยบนหน้าจอของคนนั้นคนเดียว และจำไว้ในเบราว์เซอร์นั้น
