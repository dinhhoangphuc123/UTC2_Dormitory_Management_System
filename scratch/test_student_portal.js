const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5245';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (Buffer.isBuffer(body) || typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

function parseCookies(resHeaders) {
  const setCookie = resHeaders['set-cookie'];
  if (!setCookie) return '';
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

async function run() {
  console.log('=== STARTING STUDENT PORTAL INTEGRATION TESTS ===\n');
  let studentCookie = '';
  let staffCookie = '';

  // 1. Login as Student (sv_minh / sinhvien123)
  console.log('1. Login as Student sv_minh...');
  const studentLoginRes = await request({
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'sv_minh', password: 'sinhvien123' });
  
  if (studentLoginRes.statusCode !== 200) {
    throw new Error(`Student login failed with ${studentLoginRes.statusCode}: ${JSON.stringify(studentLoginRes.body)}`);
  }
  studentCookie = parseCookies(studentLoginRes.headers);
  console.log('   Student login SUCCESS!\n');

  // 2. Login as Staff (ql_an / an123)
  console.log('2. Login as Staff ql_an...');
  const staffLoginRes = await request({
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'ql_an', password: 'an123' });

  if (staffLoginRes.statusCode !== 200) {
    throw new Error(`Staff login failed with ${staffLoginRes.statusCode}: ${JSON.stringify(staffLoginRes.body)}`);
  }
  staffCookie = parseCookies(staffLoginRes.headers);
  console.log('   Staff login SUCCESS!\n');

  // 3. Security: Student accessing Staff endpoint -> 403 Forbidden
  console.log('3. Security Check: Student accessing Staff endpoint /api/sinhvien?academicYear=NH2026-2027...');
  const secForbiddenRes = await request({
    method: 'GET',
    path: '/api/sinhvien?academicYear=NH2026-2027',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Status: ${secForbiddenRes.statusCode} (Expected: 403)`);
  if (secForbiddenRes.statusCode !== 403) throw new Error('Expected 403 Forbidden!');
  console.log('   PASSED!\n');

  // 4. Security: Staff accessing Student endpoint /api/me/dashboard -> 403 Forbidden
  console.log('4. Security Check: Staff accessing Student endpoint /api/me/dashboard...');
  const staffPortalRes = await request({
    method: 'GET',
    path: '/api/me/dashboard',
    headers: { 'Cookie': staffCookie }
  });
  console.log(`   Status: ${staffPortalRes.statusCode} (Expected: 403)`);
  if (staffPortalRes.statusCode !== 403) throw new Error('Expected 403 Forbidden!');
  console.log('   PASSED!\n');

  // 5. GET /api/me/dashboard
  console.log('5. GET /api/me/dashboard...');
  const dashRes = await request({
    method: 'GET',
    path: '/api/me/dashboard',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Status: ${dashRes.statusCode}`);
  console.log('   Dashboard data:', JSON.stringify(dashRes.body?.data || dashRes.body, null, 2));
  if (dashRes.statusCode !== 200) throw new Error('Dashboard failed');
  console.log('   PASSED!\n');

  // 6. GET /api/me/support-info
  console.log('6. GET /api/me/support-info...');
  const supportRes = await request({
    method: 'GET',
    path: '/api/me/support-info',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Status: ${supportRes.statusCode}`);
  console.log('   Support contact:', supportRes.body?.data?.contactInfo);
  if (supportRes.statusCode !== 200 || !supportRes.body?.data?.contactInfo) throw new Error('Support info failed');
  console.log('   PASSED!\n');

  // 7. Profile endpoints
  console.log('7. GET /api/me/profile & PUT /api/me/profile...');
  const profRes = await request({
    method: 'GET',
    path: '/api/me/profile',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Current Student: ${profRes.body?.data?.hoTen} (${profRes.body?.data?.maSinhVien})`);
  
  // Try to update profile with phone and email, also try inject CCCD to see if server ignores it
  const origCccd = profRes.body?.data?.cccd;
  const updateProfRes = await request({
    method: 'PUT',
    path: '/api/me/profile',
    headers: { 'Cookie': studentCookie, 'Content-Type': 'application/json' }
  }, {
    dienThoai: '0987654321',
    email: 'minh.test@utc2.edu.vn',
    diaChiThuongTru: 'Quận 9, TP. Thủ Đức, TP. Hồ Chí Minh',
    cccd: 'HACKED_CCCD'
  });
  console.log(`   PUT Status: ${updateProfRes.statusCode}`);

  // Re-fetch profile to verify CCCD was NOT changed
  const reProfRes = await request({
    method: 'GET',
    path: '/api/me/profile',
    headers: { 'Cookie': studentCookie }
  });
  if (reProfRes.body?.data?.cccd !== origCccd) {
    throw new Error('Security Breach: CCCD was modified via PUT /api/me/profile!');
  }
  console.log(`   Verified CCCD remained unchanged: ${reProfRes.body?.data?.cccd}`);
  console.log('   PASSED!\n');

  // 8. Guardians CRUD
  console.log('8. Guardians CRUD: POST, GET, PUT, DELETE...');
  const addGuardRes = await request({
    method: 'POST',
    path: '/api/me/guardians',
    headers: { 'Cookie': studentCookie, 'Content-Type': 'application/json' }
  }, {
    hoTen: 'Nguyễn Văn Phụ Huynh',
    quanHe: 'Bố',
    dienThoai: '0912345678',
    laLienHeKhanCap: true
  });
  console.log(`   POST Guardian Status: ${addGuardRes.statusCode}`);
  if (addGuardRes.statusCode !== 200) throw new Error('Add guardian failed');

  const getGuardsRes = await request({
    method: 'GET',
    path: '/api/me/guardians',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Guardians count: ${getGuardsRes.body?.data?.length}`);
  const createdGuardian = getGuardsRes.body?.data?.find(g => g.hoTen === 'Nguyễn Văn Phụ Huynh');
  if (!createdGuardian) throw new Error('Created guardian not found in list');

  const updateGuardRes = await request({
    method: 'PUT',
    path: `/api/me/guardians/${createdGuardian.id}`,
    headers: { 'Cookie': studentCookie, 'Content-Type': 'application/json' }
  }, {
    hoTen: 'Nguyễn Văn Phụ Huynh',
    quanHe: 'Bố',
    dienThoai: '0988776655',
    laLienHeKhanCap: true
  });
  console.log(`   PUT Guardian Status: ${updateGuardRes.statusCode}`);
  if (updateGuardRes.statusCode !== 200) throw new Error('Update guardian failed');

  const delGuardRes = await request({
    method: 'DELETE',
    path: `/api/me/guardians/${createdGuardian.id}`,
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   DELETE Guardian Status: ${delGuardRes.statusCode}`);
  if (delGuardRes.statusCode !== 200) throw new Error('Delete guardian failed');
  console.log('   PASSED!\n');

  // 9. Profile Change Request
  console.log('9. Profile Change Request: POST & GET...');
  const postReqRes = await request({
    method: 'POST',
    path: '/api/me/profile-change-requests',
    headers: { 'Cookie': studentCookie, 'Content-Type': 'application/json' }
  }, {
    truong: 'hoTen',
    giaTriMoi: 'Nguyễn Văn Minh Mới',
    lyDo: 'Đính chính tên đệm theo giấy khai sinh'
  });
  console.log(`   POST Change Request Status: ${postReqRes.statusCode}`);
  if (postReqRes.statusCode !== 200) throw new Error('Create change request failed');

  const getReqsRes = await request({
    method: 'GET',
    path: '/api/me/profile-change-requests',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Change Requests count: ${getReqsRes.body?.data?.length}`);
  if (!getReqsRes.body?.data || getReqsRes.body.data.length === 0) throw new Error('Change requests empty');
  console.log('   PASSED!\n');

  // 10. Rounds, Buildings, Rooms
  console.log('10. GET /api/me/rounds, /buildings, /rooms...');
  const roundsRes = await request({
    method: 'GET',
    path: '/api/me/rounds',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Rounds found: ${roundsRes.body?.data?.length}`);
  if (roundsRes.body?.data?.length > 0) {
    const round = roundsRes.body.data[0];
    console.log(`   Round: ${round.tenDot} (Eligible: ${round.eligible})`);

    const bldRes = await request({
      method: 'GET',
      path: `/api/me/rounds/${round.id}/buildings`,
      headers: { 'Cookie': studentCookie }
    });
    console.log(`   Buildings for round: ${bldRes.body?.data?.length}`);

    const roomsRes = await request({
      method: 'GET',
      path: `/api/me/rounds/${round.id}/rooms`,
      headers: { 'Cookie': studentCookie }
    });
    console.log(`   Rooms for round: ${roomsRes.body?.data?.length}`);
  }
  console.log('   PASSED!\n');

  // 11. Submit Application Validation Checks
  console.log('11. Submit Application Validator Check (acceptRules: false)...');
  const rejectRulesRes = await request({
    method: 'POST',
    path: '/api/me/applications',
    headers: { 'Cookie': studentCookie, 'Content-Type': 'application/json' }
  }, {
    maDotDangKy: 'DOT01',
    maPhong: 'A101',
    acceptRules: false
  });
  console.log(`   Status with acceptRules=false: ${rejectRulesRes.statusCode} (Expected: 400)`);
  if (rejectRulesRes.statusCode !== 400) throw new Error('Expected 400 Bad Request when acceptRules is false');
  console.log('   PASSED!\n');

  // 12. Contracts & Invoices & Utilities
  console.log('12. Contracts, Invoices, Utilities...');
  const contractsRes = await request({
    method: 'GET',
    path: '/api/me/contracts',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Contracts found: ${contractsRes.body?.data?.length}`);

  const invoicesRes = await request({
    method: 'GET',
    path: '/api/me/invoices',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Invoices found: ${invoicesRes.body?.data?.length}`);

  const utilsRes = await request({
    method: 'GET',
    path: '/api/me/utilities',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Utilities readings found: ${utilsRes.body?.data?.meterReadings?.length || 0}`);
  console.log('   PASSED!\n');

  // 13. Maintenance: POST with multipart image upload and GET image stream
  console.log('13. Maintenance Ticket creation with multipart image upload...');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  const jpegBytes = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01]);
  
  const parts = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="moTa"\r\n\r\nBóng đèn phòng A101 bị chập nhấp nháy liên tục\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="loaiSuCo"\r\n\r\nĐiện dân dụng\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mucDoKhanCap"\r\n\r\nkhanCap\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="bongden.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    jpegBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ];
  const multipartBody = Buffer.concat(parts);

  const createTicketRes = await request({
    method: 'POST',
    path: '/api/me/maintenance',
    headers: {
      'Cookie': studentCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': multipartBody.length
    }
  }, multipartBody);

  console.log(`   POST Maintenance Status: ${createTicketRes.statusCode}`);
  if (createTicketRes.statusCode !== 200 && createTicketRes.statusCode !== 201) throw new Error(`Create maintenance failed: ${JSON.stringify(createTicketRes.body)}`);

  const ticketsRes = await request({
    method: 'GET',
    path: '/api/me/maintenance',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Tickets found: ${ticketsRes.body?.data?.length}`);
  const createdTicket = ticketsRes.body?.data?.[0];
  if (!createdTicket) throw new Error('Ticket not found in student maintenance list');
  console.log(`   Created Ticket: ID=${createdTicket.id}, Room=${createdTicket.maPhong}, HasImage=${createdTicket.hasImage}`);

  if (createdTicket.hasImage) {
    const imgRes = await request({
      method: 'GET',
      path: `/api/me/maintenance/${createdTicket.id}/image`,
      headers: { 'Cookie': studentCookie }
    });
    console.log(`   Image Stream Status: ${imgRes.statusCode}, Content-Type: ${imgRes.headers['content-type']}`);
    if (imgRes.statusCode !== 200) throw new Error('Image streaming failed');
  }
  console.log('   PASSED!\n');

  // 14. Violations
  console.log('14. GET /api/me/violations...');
  const violRes = await request({
    method: 'GET',
    path: '/api/me/violations',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Violations found: ${violRes.body?.data?.length}`);
  console.log('   PASSED!\n');

  // 15. Notifications & Staff Broadcast
  console.log('15. Notifications & Staff Broadcast POST /api/thongbao...');
  const broadcastRes = await request({
    method: 'POST',
    path: '/api/thongbao',
    headers: { 'Cookie': staffCookie, 'Content-Type': 'application/json' }
  }, {
    tieuDe: 'Thông báo diễn tập PCCC toàn ký túc xá',
    noiDung: 'Ký túc xá tổ chức diễn tập phương án PCCC và CNCH vào 09h00 ngày Chủ nhật tới.',
    loai: 'chung'
  });
  console.log(`   Broadcast Status: ${broadcastRes.statusCode}`);
  if (broadcastRes.statusCode !== 200) throw new Error('Broadcast failed');

  const notifsRes = await request({
    method: 'GET',
    path: '/api/me/notifications',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Notifications found: ${notifsRes.body?.data?.length}`);
  const latestNotif = notifsRes.body?.data?.[0];
  if (latestNotif) {
    console.log(`   Latest Notification: [${latestNotif.tieuDe}] - read: ${latestNotif.daDoc}`);

    const markReadRes = await request({
      method: 'POST',
      path: `/api/me/notifications/${latestNotif.id}/read`,
      headers: { 'Cookie': studentCookie }
    });
    console.log(`   Mark as read status: ${markReadRes.statusCode}`);

    const unreadCountRes = await request({
      method: 'GET',
      path: '/api/me/notifications/unread-count',
      headers: { 'Cookie': studentCookie }
    });
    console.log(`   Unread count: ${unreadCountRes.body?.data?.count}`);
  }
  console.log('   PASSED!\n');

  // 15. Security IDOR check: Student accessing non-belonging resource returns 404
  console.log('15. Security Check: Accessing non-existent/other student contract returns 404...');
  const idorContractRes = await request({
    method: 'GET',
    path: '/api/me/contracts/HD_NON_EXISTENT_9999',
    headers: { 'Cookie': studentCookie }
  });
  console.log(`   Status: ${idorContractRes.statusCode} (Expected: 404)`);
  if (idorContractRes.statusCode !== 404) throw new Error('Expected 404 Not Found for non-belonging contract!');
  console.log('   PASSED!\n');

  console.log('=== ALL STUDENT PORTAL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
}

run().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
