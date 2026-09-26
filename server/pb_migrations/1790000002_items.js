/// <reference path="../pb_data/types.d.ts" />

// Món của một Bộ gacha (AD-1, AD-4, AD-8). Không bao giờ xoá hẳn: dùng `deleted`.
migrate(
  (app) => {
    const households = app.findCollectionByNameOrId('households')
    const member = 'household.members.id ?= @request.auth.id'
    const bodyMember = '@request.body.household.members.id ?= @request.auth.id'

    const items = new Collection({
      type: 'base',
      name: 'items',
      listRule: member,
      viewRule: member,
      createRule: `${member} && ${bodyMember}`,
      // Không cho chuyển món sang household khác, không đổi setKey/seedKey (seed dựa vào chúng)
      updateRule: `${member} && (@request.body.household:isset = false || ${bodyMember}) && @request.body.setKey:isset = false && @request.body.seedKey:isset = false`,
      // Không bao giờ xoá hẳn (AD-4): xoá = đặt deleted=true
      deleteRule: null,
      fields: [
        { name: 'household', type: 'relation', required: true, collectionId: households.id, maxSelect: 1, cascadeDelete: true },
        { name: 'setKey', type: 'text', required: true, max: 50, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        { name: 'groupKey', type: 'text', required: true, max: 50, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'rarity', type: 'number', required: true, min: 1, max: 3, onlyInt: true },
        { name: 'tags', type: 'json', maxSize: 2000 },
        {
          name: 'image',
          type: 'file',
          maxSelect: 1,
          maxSize: 5 * 1024 * 1024,
          mimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
          thumbs: ['400x300'],
          protected: true,
        },
        { name: 'attrs', type: 'json', maxSize: 100000 },
        { name: 'seedKey', type: 'text', max: 100 },
        { name: 'deleted', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_items_seed` ON `items` (`household`, `setKey`, `seedKey`) WHERE `seedKey` != ''",
        'CREATE INDEX `idx_items_household_set` ON `items` (`household`, `setKey`)',
      ],
    })
    app.save(items)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('items'))
  },
)
