class Chat {
    constructor(networking) {
        this.socket = networking.socket;
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');

        this.initializeSocketEvents();
        this.initializeDOMEvents();
    }

    initializeSocketEvents() {
        this.socket.on('chatMessage', (message) => {
            this.addMessageToChat(message);
        });
    }

    initializeDOMEvents() {
        this.chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && this.chatInput.value.trim() !== '') {
                this.sendMessage(this.chatInput.value);
                this.chatInput.value = '';
            }
        });
    }

    sendMessage(message) {
        console.log('Sending message:', message);
        this.socket.emit('chatMessage', message);
    }

    addMessageToChat(message) {
        // console.log('Adding message to chat:', message.id, message.message);
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        var sender = "User";
        if(message.id==this.socket.id){
            sender = "You";
        }
        // construct bootstrap 5 card for message
        messageElement.innerHTML = `
            <div class="card mb-2" style="width:80%; ${message.id==this.socket.id ? 'margin-left:auto' : ''}">
                <div class="card-body">
                    <h5 class="card-title text-secondary" style="font-size:12px">${sender}</h5>
                    <p class="card-text">${message.message}</p>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(messageElement);
        // this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        // use jquery to scroll to bottom of chat
        $('#chat-messages').parent().scrollTop($('#chat-messages')[0].scrollHeight);
    }
}

export default Chat;