"use strict";

var canvas
var canvasCtx;
var analyser;
var audioCtx
var source;
var dataArray;
var bufferLength;

window.onload = function(e) {
    console.log("window.onload", e, Date.now())
    canvas = document.getElementById("canvas");
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    source = audioCtx.createBufferSource();
    var request = new XMLHttpRequest();
    // Downloaded from http://soundbible.com/1010-Spotted-Owl-Call.html
    request.open('GET', 'rise.wav', true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        var audioData = request.response;

        audioCtx.decodeAudioData(audioData,
            function(buffer) {
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                setupGraph();
            },
            function(e) {
                "Error with decoding audio data" + e.err
            }
        );
    }

    request.send();
};

function setupGraph() {
    analyser = audioCtx.createAnalyser();
    source.connect(analyser);

    analyser.fftSize = 512;
    bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);
    dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);
    
    canvas = document.getElementById("canvas");
    canvasCtx = canvas.getContext('2d');
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    var startButton = document.getElementById("start");
    startButton.addEventListener("click", function() {
        var newSource = audioCtx.createBufferSource();
        newSource.buffer = source.buffer;
        newSource.connect(analyser);
        source = newSource;
        source.connect(audioCtx.destination);
        source.start();
    }, false);
    
    var stopButton = document.getElementById("stop");
    stopButton.addEventListener("click", function() {
        source.stop();
    }, false);
    
    draw();
}

function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    var barWidth = (canvas.width - bufferLength) / bufferLength;
    var barHeight;
    var x = 0;
    
    canvasCtx.fillStyle = 'rgb(200,50,50)';
    for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasCtx.fillRect(x,canvas.height-barHeight,barWidth,barHeight);
        x += barWidth + 1;
    }
}
