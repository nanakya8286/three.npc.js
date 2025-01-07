import Cookies from 'js-cookie';

class VoiceChat {
    constructor(networking) {
        this.socket = networking.socket;
        this.vcUsersDiv = document.getElementById('voiceChatUsers');
        console.log('vcUsersDiv', this.vcUsersDiv);
        
        this.mutedUsers = [];
        this.speaking = false;
        this.userSpeaking = {};
        this.volumeThreshold = 0.05; // Set the volume threshold

        var that = this;
        this.socket.on('audioStream', ({ id, audioData }) => {

            // play using networking.models[id].userData.sound1 (THREE.PositionalAudio)
            // console.log('id', id);
            that.userSpeaking[id] = true;
            var newData = audioData.split(";");
            newData[0] = "data:audio/ogg;";
            newData = newData[0] + newData[1];

            var audio = new Audio(newData);
            if (!audio || document.hidden) {
                return;
            }
            var sound = networking.models[id].userData.sound1;
            sound.setMediaElementSource(audio);
            sound.setRefDistance(20);
            sound.setVolume(1);
            window.lastSound = sound;   
            audio.play();
           
           // audio.play();

        });

        // Preserve "this" context in the update method
        this.update = this.update.bind(this);
        setInterval(this.update, 1000);
    }

    update() {
        this.vcUsersDiv.innerHTML = '';

        if (this.speaking) {
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
        // navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        // .then((stream) => {
        //     const mediaRecorder = new MediaRecorder(stream);
        //     const audioChunks = [];
        //     const audioContext = new AudioContext();
        //     const audioSource = audioContext.createMediaStreamSource(stream);
        //     const analyzer = audioContext.createAnalyser();
        //     const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        //     const volumeThreshold = 5; // Adjust this value (0-255) to change sensitivity
        //     let isSpeaking = false;
    
        //     // Connect audio source to analyzer
        //     audioSource.connect(analyzer);
    
        //     // Function to check audio volume
        //     function checkVolume() {
        //         analyzer.getByteFrequencyData(dataArray);
        //         const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        //         const newSpeaking = average > volumeThreshold;
                
        //         // Only update speaking state if it changed
        //         isSpeaking = newSpeaking;
        //         that.speaking = newSpeaking;
                
        //         return isSpeaking;
        //     }
    
        //     mediaRecorder.addEventListener("dataavailable", function (event) {
        //         // Only add audio chunk if volume is above threshold
        //         if (checkVolume()) {
        //             audioChunks.push(event.data);
        //         }
        //     });
    
        //     mediaRecorder.addEventListener("stop", function () {
        //         // Only process and send audio if we collected chunks
        //         if (audioChunks.length > 0) {
        //             const audioBlob = new Blob(audioChunks);
        //             audioChunks.length = 0; // Clear array while maintaining reference
                    
        //             const fileReader = new FileReader();
        //             fileReader.readAsDataURL(audioBlob);
        //             fileReader.onloadend = function () {
        //                 const base64String = fileReader.result;

        //                 that.socket.emit("audioStream", base64String);
        //             };
        //         }
    
        //         mediaRecorder.start();
        //         setTimeout(function () {
        //             mediaRecorder.stop();
        //         }, 1000);
        //     });
    
        //     mediaRecorder.start();
        //     setTimeout(function () {
        //         mediaRecorder.stop();
        //     }, 1000);
        // })
        // .catch((error) => {
        //     console.error('Error capturing audio.', error);
        // });
    }
}

export default VoiceChat;
