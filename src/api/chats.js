({
  create: {
    needToken: true,
    structure: {
      avatar: { mandatory: false, validators: [isString] },
      name: {
        mandatory: false,
        validators: [isString, (str) => str.length >= 1],
      },
      users: {
        mandatory: true,
        validators: [
          Array.isArray,
          (users) => users.length > 0,
          (users) => users.every(isNumber),
        ],
      },
    },
    fields: ['id', 'createdAt'],
    async controller({ name, avatar, users }, cookie) {
      const token = cookie.get('token');
      const me = await db('users').select('id').where({ token }).first();
      const [chat] = await db('chats').insert({}).returning(this.fields);
      const promises = [...users, me.id].map((userId) =>
        db('usersChats').insert({ userId, chatId: chat.id })
      );
      await Promise.all(promises);
      events.emit('chat', chat.id, cookie.get('token'));
      if (users.length > 1) {
        await db('chatsInfo').insert({ name, avatar, chatId: chat.id });
      }
      return { success: true, data: chat };
    },
  },

  read: {
    needToken: true,
    structure: {
      userId: { mandatory: true, validators: [isNumber] },
    },
    fields: ['id', 'createdAt'],
    async controller({ userId }) {
      const data = await db('usersChats')
        .select(this.fields)
        .join('chats', { chatId: 'id' })
        .where({ userId });
      return { success: true, data };
    },
  },

  participants: {
    needToken: true,
    structure: {
      id: { mandatory: true, validators: [isNumber] },
    },
    fields: [
      'id',
      'username',
      'firstName',
      'secondName',
      'avatar',
      'lastOnline',
    ],
    async controller({ id }) {
      const data = await db('usersChats')
        .join('users', { userId: 'id' })
        .where({ chatId: id });
      return { success: true, data };
    },
  },

  updateOnline: {
    needToken: true,
    structure: {
      chatId: { mandatory: true, validators: [isNumber] },
    },
    controller: async ({ chatId }, cookie) => {
      const token = cookie.get('token');
      const { id } = await db('users').select(['id']).where({ token }).first();
      await db('usersChats')
        .update({ lastTimeInChat: db.fn.now() })
        .where({ userId: id, chatId });
      return { success: true };
    },
  },
});
