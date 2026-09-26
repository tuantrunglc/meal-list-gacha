/// <reference path="../pb_data/types.d.ts" />

// Household là phạm vi dữ liệu của cả nhà (AD-3). v1: một household, tài khoản do admin tạo.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    // Tắt tự đăng ký: chỉ superuser (hoặc hook) tạo được tài khoản
    users.createRule = null
    app.save(users)

    const memberRule = 'members.id ?= @request.auth.id'
    const households = new Collection({
      type: 'base',
      name: 'households',
      listRule: memberRule,
      viewRule: memberRule,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 100 },
        {
          name: 'members',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 50,
        },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(households)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('households'))
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)
  },
)
