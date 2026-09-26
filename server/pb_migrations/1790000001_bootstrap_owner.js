/// <reference path="../pb_data/types.d.ts" />

// Tạo tài khoản chủ app và household đầu tiên từ biến môi trường (AD-3).
// Là migration (không phải hook) vì JSVM chưa có hook chạy sau khi migration được áp dụng.
// Biến môi trường phải có ở lần khởi động đầu; thiếu thì bỏ qua (tạo tay qua trang admin).
migrate((app) => {
  const email = $os.getenv('NOI_OWNER_EMAIL')
  const password = $os.getenv('NOI_OWNER_PASSWORD')
  const householdName = $os.getenv('NOI_HOUSEHOLD_NAME') || 'Nhà mình'

  if (!email || !password) {
    app.logger().warn('bootstrap: bỏ qua, thiếu NOI_OWNER_EMAIL hoặc NOI_OWNER_PASSWORD')
    return
  }

  let owner
  try {
    owner = app.findAuthRecordByEmail('users', email)
  } catch (_) {
    owner = new Record(app.findCollectionByNameOrId('users'))
    owner.set('email', email)
    owner.setPassword(password)
    owner.set('verified', true)
    app.save(owner)
  }

  const existing = app.findRecordsByFilter('households', 'members.id ?= {:id}', '', 1, 0, { id: owner.id })
  if (existing.length === 0) {
    const household = new Record(app.findCollectionByNameOrId('households'))
    household.set('name', householdName)
    household.set('members', [owner.id])
    app.save(household)
  }
})
