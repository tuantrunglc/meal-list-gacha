/// <reference path="../pb_data/types.d.ts" />

// Cấu hình theo household + Bộ (AD-7): số ngày tránh trùng.
migrate(
  (app) => {
    const households = app.findCollectionByNameOrId('households')
    const member = 'household.members.id ?= @request.auth.id'
    const bodyMember = '@request.body.household.members.id ?= @request.auth.id'
    const configs = new Collection({
      type: 'base',
      name: 'set_configs',
      listRule: member,
      viewRule: member,
      createRule: `${member} && ${bodyMember}`,
      updateRule: `${member} && @request.body.household:isset = false && @request.body.setKey:isset = false`,
      deleteRule: member,
      fields: [
        { name: 'household', type: 'relation', required: true, collectionId: households.id, maxSelect: 1, cascadeDelete: true },
        { name: 'setKey', type: 'text', required: true, max: 50, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        // number bắt buộc không nhận 0 ở PocketBase → không đặt required, kiểm 0–30 bằng min/max
        { name: 'cooldownDays', type: 'number', min: 0, max: 30, onlyInt: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_set_configs_household_set` ON `set_configs` (`household`, `setKey`)'],
    })
    app.save(configs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('set_configs'))
  },
)
