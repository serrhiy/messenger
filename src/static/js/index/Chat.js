'use strict';

import Dialog from './Dialog.js';
import chats from './Chats.js';
import transformDate from './transformDate.js';

const chatList = document.getElementsByClassName('chat-list').item(0);

const buttom = document.querySelector('.dialog .buttom');
const top = document.querySelector('.dialog .top');

const buildNumber = (count) => {
  const number = document.createElement('div');
  Object.assign(number, { className: 'number' });
  number.appendChild(document.createTextNode(count));
  return number;
};

const buildChat = (user, avatar, text = '', date = '', unreadMessages = 0) => {
  const chat = document.createElement('div');
  const img = document.createElement('img');
  const info = document.createElement('div');
  Object.assign(chat, { className: 'chat' });
  Object.assign(img, { src: avatar, alt: "User's avatar" });
  Object.assign(info, { className: 'info' });
  chat.append(img, info);
  const top = document.createElement('div');
  const buttom = document.createElement('div');
  Object.assign(top, { className: 'top' });
  Object.assign(buttom, { className: 'buttom' });
  info.append(top, buttom);
  const username = document.createElement('div');
  const time = document.createElement('div');
  Object.assign(username, { className: 'username' });
  Object.assign(time, { className: 'time passive' });
  username.appendChild(document.createTextNode(user));
  time.appendChild(document.createTextNode(date));
  top.append(username, time);
  const message = document.createElement('div');
  message.appendChild(document.createTextNode(text));
  Object.assign(message, { className: 'message passive' });
  buttom.appendChild(message);
  const unrMessages = document.createElement('div');
  Object.assign(unrMessages, { className: 'unread-messages' });
  buttom.appendChild(unrMessages);
  if (unreadMessages > 0) {
    const number = buildNumber(unreadMessages);
    unrMessages.appendChild(number);
  }
  return {
    html: chat,
    username: (string) => void (username.innerHTML = string),
    time: (date) => void (time.innerHTML = date),
    message: (text) => void (message.innerHTML = text),
    unreadMessages: (count) => {
      if (count === 0) return void (unrMessages.innerHTML = '');
      const number = unrMessages.firstChild;
      if (number) number.innerHTML = count;
      else unrMessages.appendChild(buildNumber(count));
    },
  };
};

const countUnreadMessages = (lastOnline, messages) => {
  if (!lastOnline) return messages.length;
  let unreadMessages = 0;
  const date = new Date(lastOnline);
  const { length } = messages;
  for (let index = length - 1; index >= 0; index--) {
    const { createdAt } = messages[index];
    if (createdAt - date < 0) break;
    unreadMessages++;
  }
  return unreadMessages;
};

export default class Chat extends EventTarget {
  #chat = null;
  #dialog = null;
  #unreadMessages = 0;
  lastActivity = null;
  initial = null;
  data = null;

  constructor(data, me) {
    super();
    const { lastOnline, name, avatar, lastTimeInChat, messages = [] } = data;
    this.lastActivity = new Date(lastTimeInChat);
    const unreadMessages = countUnreadMessages(lastTimeInChat, messages);
    const lastMessage = messages[messages.length - 1];
    const message = lastMessage ? lastMessage.message : '';
    const time = lastMessage ? transformDate(lastMessage.createdAt) : '';
    const chat = buildChat(name, avatar, message, time, unreadMessages);
    this.data = structuredClone(data);
    this.initial = Object.freeze(structuredClone(data));
    const dialog = new Dialog(name, lastOnline, messages, me);
    this.#unreadMessages = unreadMessages;
    chat.html.addEventListener('click', () => {
      this.lastActivity = new Date();
      this.dispatchEvent(new CustomEvent('click'));
      const active = chats.find((chat) => chat.isActive());
      if (active) active.makeUnactive();
      this.makeActive();
      buttom.innerHTML = '';
      top.innerHTML = '';
      dialog.generate();
      dialog.scroll();
      if (this.#unreadMessages > 0) {
        this.#unreadMessages = 0;
        chat.unreadMessages(0);
      }
    });
    dialog.onMessage((message) => {
      this.lastActivity = new Date();
      const event = new CustomEvent('message', { detail: message });
      this.dispatchEvent(event);
      chat.message(message);
      chat.time(transformDate());
    });
    this.#dialog = dialog;
    this.#chat = chat;
  }

  generate() {
    chatList.appendChild(this.#chat.html);
  }

  addMessage(message) {
    if (!this.isActive()) {
      const count = ++this.#unreadMessages;
      this.#chat.unreadMessages(count);
    }
    this.#dialog.addMessage(message, false);
    this.#chat.message(message);
  }

  isActive() {
    return this.#chat.html.classList.contains('active');
  }

  makeUnactive() {
    this.#chat.html.classList.remove('active');
  }

  makeActive() {
    this.#chat.html.classList.add('active');
  }
}
