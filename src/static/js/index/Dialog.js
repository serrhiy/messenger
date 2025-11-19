'use strict';

import Messages from './Messages.js';
import transformDate from './transformDate.js';
import chats from './Chats.js';

const chatList = document.getElementsByClassName('chat-list').item(0);

const buttom = document.querySelector('.dialog .buttom');
const top = document.querySelector('.dialog .top');

const buildNumber = (count) => {
  const number = document.createElement('div');
  Object.assign(number, { className: 'number' });
  number.appendChild(document.createTextNode(count));
  return number;
};

const buildDialog = (
  user,
  avatar,
  text = '',
  date = '',
  unreadMessages = 0,
) => {
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
    const createdAt = new Date(messages[index].createdAt);
    if (createdAt - date < 0) break;
    unreadMessages++;
  }
  return unreadMessages;
};

export default class Dialog extends EventTarget {
  #dialog = null;
  #messageAre = null;
  #unreadMessages = 0;
  user = null;
  chat = null;

  constructor(me, user, chat = {}, messages = []) {
    super();
    const name = user.firstName + ' ' + user.secondName;
    if (messages.length > 0) {
      const unreadMessages = countUnreadMessages(me.lastTimeInChat, messages);
      const lastMessage = messages.at(-1);
      const { message } = lastMessage;
      const time = transformDate(lastMessage.createdAt);
      this.#dialog = buildDialog(
        name,
        user.avatar,
        message,
        time,
        unreadMessages,
      );
      this.#unreadMessages = unreadMessages;
    } else {
      this.#dialog = buildDialog(name, user.avatar);
    }
    const messagesArea = new Messages(user, messages);
    this.#dialog.html.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('click'));
      const active = chats.find((chat) => chat.isActive());
      if (active) active.makeUnactive();
      this.makeActive();
      buttom.innerHTML = '';
      top.innerHTML = '';
      messagesArea.generate();
      messagesArea.scroll();
      if (this.#unreadMessages > 0) {
        this.#unreadMessages = 0;
        this.#dialog.unreadMessages(0);
      }
    });
    messagesArea.onMessage((message) => {
      const event = new CustomEvent('message', { detail: message });
      this.dispatchEvent(event);
      this.#dialog.message(message);
      this.#dialog.time(transformDate());
    });
    this.#messageAre = messagesArea;
    this.user = Object.freeze(structuredClone(user));
    this.chat = Object.freeze(structuredClone(chat));
  }

  generate() {
    chatList.appendChild(this.#dialog.html);
  }

  addMessage(message) {
    if (!this.isActive()) {
      const count = ++this.#unreadMessages;
      this.#dialog.unreadMessages(count);
    }
    this.#messageAre.addMessage(message, false);
    this.#dialog.message(message);
  }

  isActive() {
    return this.#dialog.html.classList.contains('active');
  }

  makeUnactive() {
    this.#dialog.html.classList.remove('active');
  }

  makeActive() {
    this.#dialog.html.classList.add('active');
  }

  trigerClick(event) {
    this.#dialog.html.dispatchEvent(event);
  }
}
