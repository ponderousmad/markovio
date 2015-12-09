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
    request.open('GET', 'owl.mp3', true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        var audioData = request.response;

        audioCtx.decodeAudioData(audioData,
            function(buffer) {
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                // source.loop = true;
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

    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);
    
    canvas = document.getElementById("canvas");
    canvasCtx = canvas.getContext('2d');
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    source.start(0);  
    draw();
}

function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();
    var sliceWidth = canvas.width * 1.0 / bufferLength;
    var x = 0;
    
    for(var i = 0; i < bufferLength; i++) {
        var v = dataArray[i] / 128.0;
        var y = v * canvas.height / 2;

        if(i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }
    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();
}