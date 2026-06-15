const { test, expect } = require('@playwright/test');

const accounts = [
  { username: 'student1', fullname: 'Sinh viên 1', password: 'student123' },
  { username: 'student2', fullname: 'Sinh viên 2', password: 'student123' },
  { username: 'student3', fullname: 'Sinh viên 3', password: 'student123' }
];

for (const account of accounts) {
  test(`Kiểm thử Student Dashboard cho tài khoản ${account.username}`, async ({ page }) => {
    // 1. Đăng nhập
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"]', account.username);
    await page.fill('input[type="password"]', account.password);
    
    // Bấm nút đăng nhập
    await page.click('button[type="submit"]');

    // Chờ điều hướng tới dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // 2. Dữ liệu cá nhân có render đúng không?
    // Kiểm tra tên hiển thị (Xin chào, {fullname} 👋)
    const welcomeText = await page.locator('h1').innerText();
    expect(welcomeText).toContain(`Xin chào, ${account.fullname}`);

    // 3. Số dư tín chỉ xanh trên Blockchain có khớp với giao diện không?
    // DashboardPage render: "Bạn đã đạt {bal} / {nextGoal} UGC" trong .top-text
    const ugcTextLocator = page.locator('.top-text');
    await expect(ugcTextLocator).toBeVisible();
    const ugcText = await ugcTextLocator.innerText();
    expect(ugcText).toContain('Bạn đã đạt');
    expect(ugcText).toContain('UGC');
    
    // Log ra để verify bằng mắt (tuỳ chọn)
    console.log(`[${account.username}] Render UGC Text:`, ugcText);

    // 4. Các chức năng trên dashboard có hoạt động mượt mà không?
    // Kiểm tra biểu đồ Tăng trưởng tín chỉ load thành công không (bằng thẻ SVG hoặc class .recharts-wrapper)
    const chart = page.locator('.recharts-wrapper');
    // Hoặc nếu data rỗng thì nó hiển thị "Chưa có tín chỉ tuần này" -> nên kiểm tra fallback
    const chartBox = page.locator('.chart-activity-row');
    await expect(chartBox).toBeVisible();

    // Kiểm tra Recent Activities render
    const activitiesHeader = page.locator('h2:has-text("Hoạt động gần đây")');
    await expect(activitiesHeader).toBeVisible();

    // Kiểm tra Nhiệm vụ tuần này
    const taskHeader = page.locator('h2:has-text("Nhiệm vụ tuần này")');
    await expect(taskHeader).toBeVisible();
    
    console.log(`✅ [${account.username}] Dashboard render đầy đủ tính năng!`);
  });
}
