
var canvasCtx;

window.onload = function(e) {
    console.log("window.onload", e, Date.now())
    var canvas = document.getElementById("canvas");
    
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var analyser = audioCtx.createAnalyser();

    // source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.connect(distortion);

    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);

    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    
    canvasCtx = canvas.getContext('2d');
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
};

function draw() {
}