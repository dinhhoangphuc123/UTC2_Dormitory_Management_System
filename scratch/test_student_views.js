const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING STUDENT PORTAL FRAME SCAFFOLDING ===\n');

// 1. Check _Layout.cshtml script inclusions
const layoutPath = path.join(__dirname, '../Dormitory/Web/Views/Shared/_Layout.cshtml');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const expectedScripts = [
  '~/js/ktx-app.js',
  '~/js/ktx-extended-views.js',
  '~/js/ktx-student-views.js'
];

console.log('1. Checking _Layout.cshtml script order...');
let lastIdx = -1;
for (const scr of expectedScripts) {
  const idx = layoutContent.indexOf(scr);
  if (idx === -1) {
    throw new Error(`Missing script: ${scr} in _Layout.cshtml`);
  }
  if (idx <= lastIdx) {
    throw new Error(`Script ${scr} is not in correct sequential order`);
  }
  lastIdx = idx;
  console.log(`   Found ${scr} (asp-append-version: ${layoutContent.substring(idx, idx + 60).includes('asp-append-version="true"')})`);
}
console.log('   PASSED!\n');

// 2. Syntax & evaluation check of ktx-student-views.js
console.log('2. Evaluating wwwroot/js/ktx-student-views.js...');
const studentViewsPath = path.join(__dirname, '../Dormitory/Web/wwwroot/js/ktx-student-views.js');
const studentViewsContent = fs.readFileSync(studentViewsPath, 'utf8');

// Mock window and DOM for execution
global.window = global;
global.document = {
  createElement: (tag) => ({
    tagName: tag,
    innerHTML: ''
  })
};

eval(studentViewsContent);

if (!global.window.KtxStudentViews) {
  throw new Error('window.KtxStudentViews was not defined!');
}
console.log('   window.KtxStudentViews instantiated successfully.');

const studentTabs = [
  'sv-tong-quan',
  'sv-dot-dang-ky',
  'sv-dang-ky',
  'sv-don-cua-toi',
  'sv-thanh-toan',
  'sv-hop-dong',
  'sv-hoa-don',
  'sv-sua-chua',
  'sv-vi-pham',
  'sv-ho-so',
  'sv-thong-bao',
  'sv-ho-tro'
];

console.log('   Checking hasView() for all 12 student tabs:');
for (const tab of studentTabs) {
  const exists = window.KtxStudentViews.hasView(tab);
  if (!exists) {
    throw new Error(`hasView('${tab}') returned false!`);
  }
}
console.log(`   All ${studentTabs.length} tabs confirmed valid.`);

// Check statusBadge
console.log('   Checking statusBadge():');
const testStates = ['dangO', 'choDuyet', 'choThanhToan', 'hetHan', 'biTuChoi', 'chuaDangKy'];
for (const s of testStates) {
  const badgeHtml = window.KtxStudentViews.statusBadge(s);
  if (!badgeHtml || !badgeHtml.includes('inline-flex')) {
    throw new Error(`statusBadge('${s}') returned invalid HTML`);
  }
}
console.log('   statusBadge() passed for all states.');

// Check renderView for each tab
console.log('   Testing renderView() on each tab:');
for (const tab of studentTabs) {
  const container = { innerHTML: '' };
  window.KtxStudentViews.renderView(tab, container, {});
  if (!container.innerHTML || !container.innerHTML.includes('page-content-enter')) {
    throw new Error(`renderView('${tab}') did not output valid HTML frame!`);
  }
}
console.log('   All 12 tabs rendered valid placeholder frames.');
console.log('   PASSED!\n');

// 3. Check ktx-extended-views.js exports renderMetricCard
console.log('3. Checking ktx-extended-views.js exports renderMetricCard...');
const extViewsPath = path.join(__dirname, '../Dormitory/Web/wwwroot/js/ktx-extended-views.js');
const extViewsContent = fs.readFileSync(extViewsPath, 'utf8');
if (!extViewsContent.includes('renderMetricCard') || !extViewsContent.includes('renderMetricCard\n    };')) {
  throw new Error('renderMetricCard not exported from ktx-extended-views.js');
}
console.log('   renderMetricCard export verified in ktx-extended-views.js.');
console.log('   PASSED!\n');

// 4. Check ktx-app.js changes
console.log('4. Checking ktx-app.js additions...');
const appPath = path.join(__dirname, '../Dormitory/Web/wwwroot/js/ktx-app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

const requiredTokens = [
  "isStudent = state.currentUser.roleCode === 'sinhVien'",
  "sv-tong-quan",
  "sv-dot-dang-ky",
  "sv-don-cua-toi",
  "sv-thanh-toan",
  "sv-hop-dong",
  "sv-hoa-don",
  "sv-sua-chua",
  "sv-vi-pham",
  "sv-ho-so",
  "sv-thong-bao",
  "sv-ho-tro",
  "window.KtxStudentViews.hasView(tab)",
  "escapeHtml",
  "formatVND",
  "getCurrentUser: () => state.currentUser",
  "getState: () => state"
];

for (const token of requiredTokens) {
  if (!appContent.includes(token)) {
    throw new Error(`Missing expected token in ktx-app.js: ${token}`);
  }
}
console.log('   All required tokens in ktx-app.js verified.');
console.log('   PASSED!\n');

console.log('=== ALL SCAFFOLDING VERIFICATIONS SUCCEEDED! ===');
