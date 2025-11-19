'use strict';

import setResizing from './resizing.js';
import api from '../api.js';
import Dialog from './Dialog.js';
import chats from './Chats.js';

const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((val, fn) => fn(val), x);

const searchInput = document.getElementById('search-input');
const chatList = document.getElementById('chat-list');

const dialogFactory = (me, user, chat = {}, messages = []) => {
  const dialog = new Dialog(me, user, chat, messages);
  dialog.addEventListener('message', async (event) => {
    const { detail: message } = event;
    await api.messages.create({ chatId: chat.id, message });
    await api.chats.updateOnline({ chatId: chat.id });
  });
  dialog.addEventListener('click', async () => {
    await api.chats.updateOnline({ chatId: chat.id });
  });
  return dialog;
};

const onSearchUser = (me) => async () => {
  const { value } = searchInput;
  chatList.innerHTML = '';
  if (value.length === 0) return;
  const users = await api.users.read({ firstName: value, username: value });
  const dialogs = users.filter(
    (user) =>
      user.id !== me.id && !chats.find((chat) => chat.user.id === user.id),
  );
  for (const user of dialogs) {
    const { lastOnline: lastTimeInChat } = user;
    const updatedUser = { ...user, lastTimeInChat };
    const chat = new Dialog(me, updatedUser);
    chat.addEventListener('click', async (event) => {
      chatList.innerHTML = '';
      const rawDialog = await api.chats.create({ users: [user.id] });
      const dialog = dialogFactory(me, updatedUser, rawDialog);
      dialog.trigerClick(event);
      const active = chats.find((chat) => chat.isActive());
      if (active) active.makeUnactive();
      dialog.makeActive();
      chats.push(dialog);
      chats.draw();
      searchInput.value = '';
    });
    chat.generate();
  }
};

const types = {
  chat: async (myUser, chat) => {
    const participants = await api.chats.participants({ id: chat.id });
    const users = participants.filter((user) => user.id !== myUser.id);
    if (users.length > 1) return; // to do
    const [user] = users;
    const me = participants.find((user) => user.id === myUser.id);
    const dialog = dialogFactory(me, user, chat);
    chats.push(dialog);
    chats.draw();
  },
  message: async (myUser, message) => {
    const { message: text, chatId } = message;
    const chat = chats.find((chat) => chat.chat.id === chatId);
    chat.addMessage(text);
    if (chat.isActive()) await api.chats.updateOnline({ chatId });
  },
};

const start = async () => {
  const ws = new WebSocket('https://127.0.0.1:8088/');
  const rawChats = await api.chats.read();
  const me = await api.users.me();
  for (const chat of rawChats) {
    const participants = await api.chats.participants({ id: chat.id });
    const users = participants.filter((user) => user.id !== me.id);
    if (users.length > 1) continue; // to do
    const [participant] = users;
    const myUser = participants.find((user) => user.id === me.id);
    const messages = await api.messages.read({ chatId: chat.id });
    const dialog = dialogFactory(myUser, participant, chat, messages);
    chats.push(dialog);
  }
  chats.draw();
  searchInput.addEventListener('input', onSearchUser(me));
  ws.addEventListener('message', async (event) => {
    const { type, data } = JSON.parse(event.data);
    const exists = type in types;
    if (!exists) return;
    await types[type](me, data);
  });
};

const main = pipe(setResizing, start);

main();
