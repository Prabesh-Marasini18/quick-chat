// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCrihDWCju9xH3V1X30Ha3speGZj3skT_8",
  authDomain: "quickchat-9dab5.firebaseapp.com",
  projectId: "quickchat-9dab5",
  storageBucket: "quickchat-9dab5.appspot.com",
  messagingSenderId: "58538502227",
  appId: "1:58538502227:web:ce149e7ac1999217c53ea6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// --- Elements ---
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login');
const registerBtn = document.getElementById('register');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logoutBtn');

const usersList = document.getElementById('users-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const chatHeader = document.getElementById('chat-header');
const emojiBtn = document.getElementById('emojiBtn');

let currentUser = null;
let selectedUser = null;

// --- Register ---
registerBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      online: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    currentUser = user;
    showChat();
  } catch (error) {
    authError.textContent = error.message;
  }
});

// --- Login ---
loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;

      db.collection('users').doc(currentUser.uid).update({ online: true });

      showChat();
    })
    .catch(error => authError.textContent = error.message);
});

// --- Logout ---
logoutBtn.addEventListener('click', () => {
  db.collection('users').doc(currentUser.uid).update({ online: false });
  auth.signOut().then(() => location.reload());
});

// --- Show Chat ---
function showChat() {
  authContainer.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  loadUsers();
}

// --- Load Users ---
function loadUsers() {
  db.collection('users').onSnapshot(snapshot => {
    usersList.innerHTML = '';
    let firstUser = null;

    snapshot.docs.forEach(doc => {
      const user = doc.data();
      if(user.uid !== currentUser.uid){
        if(!firstUser) firstUser = user;
        const li = document.createElement('li');
        li.textContent = `${user.email} ${user.online ? '🟢' : '⚪'}`;
        li.className = "p-2 rounded-lg cursor-pointer hover:bg-blue-100 transition";
        li.addEventListener('click', () => {
          selectedUser = user;
          loadMessages();
        });
        usersList.appendChild(li);
      }
    });

    if(firstUser){
      selectedUser = firstUser;
      loadMessages();
    }
  });

  // Update current user online
  db.collection('users').doc(currentUser.uid).set({ online: true }, { merge: true });
}

// --- Load Messages ---
function loadMessages(){
  messagesDiv.innerHTML = '';
  chatHeader.classList.remove('hidden');
  chatHeader.textContent = selectedUser.email;

  const chatId = getChatId(currentUser.uid, selectedUser.uid);
  db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp')
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = '';
      snapshot.docs.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement('div');
        div.className = 'flex ' + (msg.sender === currentUser.uid ? 'justify-end' : 'justify-start');

        const bubble = document.createElement('div');
        bubble.className = 'inline-block p-3 m-1 rounded-lg max-w-xs break-words ' +
          (msg.sender === currentUser.uid ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800');

        if(msg.type === 'text') bubble.textContent = msg.content;
        else if(msg.type === 'file'){
          if(msg.fileURL.match(/\.(jpeg|jpg|gif|png)$/)) bubble.innerHTML = `<img src="${msg.fileURL}" class="max-w-xs rounded-lg">`;
          else if(msg.fileURL.match(/\.(mp4|webm|ogg)$/)) bubble.innerHTML = `<video src="${msg.fileURL}" controls class="max-w-xs rounded-lg"></video>`;
          else bubble.innerHTML = `<a href="${msg.fileURL}" target="_blank" class="underline">Download File</a>`;
        }

        if(msg.timestamp){
          const time = msg.timestamp.toDate().toLocaleTimeString();
          bubble.innerHTML += `<div class="text-xs text-gray-500 mt-1">${time}</div>`;
        }

        div.appendChild(bubble);
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      });
    });
}

// --- Send Message ---
sendBtn.addEventListener('click', async () => {
  if(!selectedUser) return alert("Select a user first!");
  const chatId = getChatId(currentUser.uid, selectedUser.uid);

  let msgData = { sender: currentUser.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp() };

  if(fileInput.files[0]){
    const file = fileInput.files[0];
    const storageRef = storage.ref('files/' + Date.now() + '_' + file.name);
    await storageRef.put(file);
    const fileURL = await storageRef.getDownloadURL();
    msgData.type = 'file';
    msgData.fileURL = fileURL;
  } else if(messageInput.value.trim() !== ''){
    msgData.type = 'text';
    msgData.content = messageInput.value.trim();
  } else return;

  await db.collection('chats').doc(chatId).collection('messages').add(msgData);
  messageInput.value = '';
  fileInput.value = '';
});

// --- Emoji Button ---
emojiBtn.addEventListener('click', () => messageInput.value += '😊');

// --- Generate Chat ID ---
function getChatId(uid1, uid2){
  return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
}
