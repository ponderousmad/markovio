"use strict";

var canvas
var canvasCtx;
var analyser;
var audioCtx
var source;
var sourceBuffer;
var bufferLength;
var frequencyArray;
var realFrequencies;
var imagFrequencies;
var waveformArray;
var reconstruction;
var snapshot = false;
var playing = false;

function logExtremes(buffer)
{
    var min = 1e6;
    var max = -1e6;
    for(var i = 0; i < buffer.length; ++i) {
        var sample = buffer[i];
        min = Math.min(min, sample);
        max = Math.max(max, sample);
    }
    console.log("Min: " + min + ", Max: " + max );
}

window.onload = function(e) {
    console.log("window.onload", e, Date.now())
    canvas = document.getElementById("canvas");
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    source = audioCtx.createBufferSource();
    var request = new XMLHttpRequest();
    request.open('GET', 'dtmf.wav', true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        var audioData = request.response;

        audioCtx.decodeAudioData(audioData,
            function(buffer) {
                sourceBuffer = buffer;
                
                var pcmData = new Float32Array(buffer.length);
                sourceBuffer.copyFromChannel(pcmData, 0, 0);
                logExtremes(pcmData);
                
                source.buffer = sourceBuffer;
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

function stop() {
    if(playing) {
        source.disconnect(analyser);
        source.disconnect(audioCtx.destination);
        source.stop();
        playing = false;
    }
}

function play(buffer, loop) {
    stop();
    source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(analyser);
    source.connect(audioCtx.destination);
    source.start();
    playing = true;
    snapshot = false;
}

function setupGraph() {
    analyser = audioCtx.createAnalyser();
    source.connect(analyser);

    analyser.fftSize = 1024;
    bufferLength = analyser.frequencyBinCount;
    console.log("FFT size: " + bufferLength);
    console.log("Sample rate: " + audioCtx.sampleRate);
    console.log("Sample window: " + bufferLength / audioCtx.sampleRate);
    
    frequencyArray = new Uint8Array(bufferLength);
    waveformArray = new Uint8Array(bufferLength);
    reconstruction = new Float32Array(bufferLength);
    
    realFrequencies = new Float32Array(bufferLength);
    imagFrequencies = new Float32Array(bufferLength);
  
    canvas = document.getElementById("canvas");
    canvasCtx = canvas.getContext('2d');
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    document.getElementById("start").addEventListener("click", function() {
        play(sourceBuffer, false);
    }, false);
    
    document.getElementById("stop").addEventListener("click", function() {
        stop();
    }, false);
    
    document.getElementById("snapshot").addEventListener("click", function() {
        snapshot = !snapshot;
        if(snapshot) {
            console.log("Captured snapshot:");
            logExtremes(reconstruction);
            stop();
        }
    }, false);
    
    document.getElementById("restart").addEventListener("click", function() {
        console.log("Playing reconstruction");
        logExtremes(reconstruction);
        var buffer = audioCtx.createBuffer(1, bufferLength, audioCtx.sampleRate);
        buffer.copyToChannel(reconstruction, 0, 0);
        play(buffer, true);
    }, false);
    
    document.getElementById("tone").addEventListener("click", function() {
        var sampleDuration = 1 / audioCtx.sampleRate;
        var frequency = document.getElementById("toneHz").value * 1.0;
        console.log("Playing tone with frequency " + frequency);
        var sampleWindow = 10.0/frequency;
        var toneLength = sampleWindow * audioCtx.sampleRate;
        var toneBuffer = new Float32Array(toneLength);
        for(var i = 0; i < toneLength; ++i) {
            toneBuffer[i] = 0.8 * Math.sin(i * sampleDuration * frequency * 2.0 * Math.PI);
        }
        logExtremes(toneBuffer);
        var buffer = audioCtx.createBuffer(1, toneLength, audioCtx.sampleRate);
        buffer.copyToChannel(toneBuffer, 0, 0);
        play(buffer, true);
    }, false);
    
    draw();
}

// Attempt to implement Discreet Fourier Transform
// https://en.wikipedia.org/wiki/Discrete_Fourier_transform#Definition
function fourier(waveform, frequenciesR, frequenciesI) {
    var timeScale = 1.0 / waveform.length
    var maxFrequency = 0.0;
    for(var k = 0; k < frequenciesR.length; ++k) {
        var realF = 0;
        var imagF = 0;
        for(var n = 0; n < waveform.length; ++n) {
            var v = (waveform[n] / 128.0) - 1; // scale and unbias
            var theta = 2 * Math.PI * n * k * timeScale;
            realF += v * Math.cos(theta);
            imagF -= v * Math.sin(theta);
        }
        frequenciesR[k] = realF;
        frequenciesI[k] = imagF;
        maxFrequency = Math.max(realF, maxFrequency);
    }
    return maxFrequency;
}

// Inverse DFT as above.
function inverseFourier(frequenciesR, frequenciesI, waveform) {
    var timeScale = 1.0 / waveform.length
    for(var n = 0; n < waveform.length; ++n) {
        var v = 0;
        for(var k = 0; k < frequenciesR.length; ++k) {
            var theta = 2 * Math.PI * n * k * timeScale;
            v += frequenciesR[k] * Math.cos(theta) - frequenciesI[k] * Math.sin(theta);
        }
        waveform[n] = v * timeScale;
    }
}

function draw() {
    requestAnimationFrame(draw);
    if(!snapshot) {
        analyser.getByteFrequencyData(frequencyArray);
        analyser.getByteTimeDomainData(waveformArray);
    }
    var scaleMax = fourier(waveformArray, realFrequencies, imagFrequencies);
    
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    var stride = 1;
    var scaledLength = bufferLength;
    while(scaledLength > 512) {
        stride *= 2;
        scaledLength /= 2;
    }

    var barWidth = (canvas.width - scaledLength) / scaledLength;
    var x = 0;
    
    var frequencyScale = 1/256.0;
    var heightScale = (canvas.height - 20) * frequencyScale;
    var altHeightScale = (canvas.height - 20) / Math.max(1, scaleMax);
    for(var i = 0; i < bufferLength; i += stride) {
        var barHeight = 0;
        var altBarHeight = 0;
        for(var s = 0; s < stride; ++s) {
            barHeight += frequencyArray[i] * heightScale;
            altBarHeight += realFrequencies[i] * altHeightScale;
        }
        barHeight /= stride;
        altBarHeight /= stride;
        canvasCtx.fillStyle = 'rgb(200,50,50)';
        canvasCtx.fillRect(x,canvas.height-barHeight,1,barHeight);
        canvasCtx.fillStyle = 'rgb(50,200,50)';
        canvasCtx.fillRect(x+1,canvas.height-altBarHeight,barWidth,altBarHeight);
        x += barWidth + 1;
    }
    
    var sliceWidth = canvas.width * 1.0 / scaledLength;
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
    canvasCtx.beginPath();
    x = 0;
    for(var i = 0; i < bufferLength; i += stride) {
        var v = waveformArray[i] / 128.0;
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
    
    inverseFourier(realFrequencies, imagFrequencies, reconstruction);
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(0, 255, 255)';
    canvasCtx.beginPath();
    x = 0;
    for(i = 0; i < bufferLength; i += stride) {
        var v = reconstruction[i] + 1;
        y = v * canvas.height / 2;

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
