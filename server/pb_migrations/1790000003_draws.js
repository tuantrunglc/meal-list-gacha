/// <reference path="../pb_data/types.d.ts" />

// Mâm đã chốt (AD-4, AD-7): chỉ tạo hoặc xoá, không sửa. `entries` là snapshot để lịch sử
// vẫn hiện được khi món bị sửa hay xoá.
migrate(
  (app) => {
    const households = app.findCollectionByNameOrId('households')
    const member = 'household.members.id ?= @request.auth.id'
    const draws = new Collection({
      type: 'base',
      name: 'draws',
      listRule: member,
      viewRule: member,
      // chosenAt do client ghi: chỉ nhận trong khoảng hôm qua..ngày mai (lệch giờ máy vừa phải)
      createRule: `${member} && @request.body.household.members.id ?= @request.auth.id && @request.body.chosenAt >= @yesterday && @request.body.chosenAt <= @tomorrow`,
      updateRule: null,
      deleteRule: member,
      fields: [
        { name: 'household', type: 'relation', required: true, collectionId: households.id, maxSelect: 1, cascadeDelete: true },
        { name: 'setKey', type: 'text', required: true, max: 50, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        // Do client ghi lúc chốt (ISO UTC)
        { name: 'chosenAt', type: 'date', required: true },
        { name: 'entries', type: 'json', required: true, maxSize: 20000 },
        { name: 'created', type: 'autodate', onCreate: true },
      ],
      indexes: ['CREATE INDEX `idx_draws_household_set_chosen` ON `draws` (`household`, `setKey`, `chosenAt`)'],
    })
    app.save(draws)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('draws'))
  },
)
