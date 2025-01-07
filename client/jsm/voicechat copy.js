import Cookies from 'js-cookie'

class VoiceChat {
    constructor(networking) {
        this.socket = networking.socket;
        this.vcUsersDiv = document.getElementById('voiceChatUsers');
        console.log('vcUsersDiv', this.vcUsersDiv);
        this.mutedUsers = [];
        this.speaking = false;
        this.userSpeaking = {};
        var that = this;
        this.socket.on('audioStream', ({ id, audioData }) => {
            console.log('id', id);
            that.userSpeaking[id] = true;
            var newData = audioData.split(";");
            newData[0] = "data:audio/ogg;";
            newData = newData[0] + newData[1];

            var audio = new Audio(newData);
            if (!audio || document.hidden) {
                return;
            }
            audio.play();
        });

        // Preserve "this" context in the update method
        this.update = this.update.bind(this);
        setInterval(this.update, 1000);
    }

    update() {
        this.vcUsersDiv.innerHTML = '';


        // Example of updating the list of users in the voice chat
        // this.vcUsersDiv.innerHTML = '<div class="d-flex align-items-center"><i class="bi bi-volume-up-fill"></i><div class="ms-2">User1</div></div>';
        if(this.speaking) {
            this.vcUsersDiv.innerHTML = '<div class="d-flex align-items-center"><i class="bi bi-volume-up-fill"></i><div class="ms-2">You</div></div>';
        }
        for (var key in this.userSpeaking) {
            if (this.userSpeaking[key]) {
                this.vcUsersDiv.innerHTML += '<div class="d-flex align-items-center"><i class="bi bi-volume-up-fill"></i><div class="ms-2">User</div></div>';
            }
        }

        this.speaking = false;
        for (var key in this.userSpeaking) {
            this.userSpeaking[key] = false;
        }
    }

    startRecording() {
        var that = this;
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then((stream) => {
                var mediaRecorder = new MediaRecorder(stream);
                var audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", function (event) {
                    that.speaking = true;
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", function () {
                    var audioBlob = new Blob(audioChunks);
                    audioChunks = [];
                    var fileReader = new FileReader();
                    fileReader.readAsDataURL(audioBlob);
                    fileReader.onloadend = function () {
                        var base64String = fileReader.result;
                        that.socket.emit("audioStream", base64String);
                    };

                    mediaRecorder.start();
                    setTimeout(function () {
                        mediaRecorder.stop();
                    }, 1000);
                });

                mediaRecorder.start();
                setTimeout(function () {
                    mediaRecorder.stop();
                }, 1000);
            })
            .catch((error) => {
                console.error('Error capturing audio.', error);
            });
    }
}

export default VoiceChat;