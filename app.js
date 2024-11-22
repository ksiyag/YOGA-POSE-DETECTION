const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const captureButton = document.getElementById('capture');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const accuracyText = document.getElementById('accuracy');
const poseNameText = document.getElementById('pose-name');
let net;

// Function to start video streaming
async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error("Error accessing the camera: ", error);
        alert("Unable to access the camera. Please check your camera settings.");
    }
}

// Capture a snapshot from the video
function captureSnapshot() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataURL = canvas.toDataURL('image/png');
    const imageWindow = window.open("");
    imageWindow.document.write('<img src="' + dataURL + '" alt="Snapshot" style="max-width:100%; height:auto;"/>');
}

// Load the PoseNet model
async function loadPosenet() {
    net = await posenet.load();    
}

// Perform pose detection and draw the detected keypoints
async function detectPose() {
    const pose = await net.estimateSinglePose(video, {
        flipHorizontal: false,
    });
    drawPose(pose);
    updatePoseAccuracy(pose);
    identifyCurrentPose(pose);
    requestAnimationFrame(detectPose); // Keep detecting poses
}

// Update pose accuracy display
function updatePoseAccuracy(pose) {
    const keypoints = pose.keypoints.filter(k => k.score >= 0.5);
    const accuracy = (keypoints.length / pose.keypoints.length) * 100;
    accuracyText.innerText = accuracy.toFixed(2) + '%';
}

// Identify the current yoga pose based on keypoints
function identifyCurrentPose(pose) {
    const keypoints = pose.keypoints.filter(k => k.score >= 0.5);
    
    if (keypoints.length === 0) {
        poseNameText.innerText = 'N/A'; // No pose detected
        return;
    }

    const nose = pose.keypoints.find(k => k.part === 'nose');
    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder');
    const leftHip = pose.keypoints.find(k => k.part === 'leftHip');
    const rightHip = pose.keypoints.find(k => k.part === 'rightHip');
    const leftKnee = pose.keypoints.find(k => k.part === 'leftKnee');
    const rightKnee = pose.keypoints.find(k => k.part === 'rightKnee');
    const leftAnkle = pose.keypoints.find(k => k.part === 'leftAnkle');
    const rightAnkle = pose.keypoints.find(k => k.part === 'rightAnkle');

    // Check for "Tree Pose"
    if (leftKnee.score > 0.5 && leftAnkle.score > 0.5 && rightKnee.score > 0.5) {
        if (leftKnee.position.y < leftHip.position.y) {
            poseNameText.innerText = 'Tree Pose';
            return;
        }
    }

    // Check for "Warrior Pose"
    if (leftShoulder.score > 0.5 && rightShoulder.score > 0.5 &&
        leftHip.score > 0.5 && rightHip.score > 0.5 &&
        leftKnee.score > 0.5 && rightKnee.score > 0.5) {
        
        if (leftKnee.position.x < leftHip.position.x && rightKnee.position.y < rightHip.position.y) {
            poseNameText.innerText = 'Warrior Pose';
            return;
        }
    }

    // Check for "Cobra Pose"
    if (leftShoulder.score > 0.5 && rightShoulder.score > 0.5 &&
        leftHip.score > 0.5 && rightHip.score > 0.5 &&
        leftKnee.score <= 0.5 && rightKnee.score <= 0.5) {
        
        const neck = pose.keypoints.find(k => k.part === 'neck');
        if (neck && neck.score > 0.5 && nose.position.y < neck.position.y) {
            poseNameText.innerText = 'Cobra Pose';
            return;
        }
    }

    // Check for "Downward Dog"
    if (leftShoulder.score > 0.5 && rightShoulder.score > 0.5 &&
        leftHip.score > 0.5 && rightHip.score > 0.5 &&
        leftAnkle.score > 0.5 && rightAnkle.score > 0.5) {
        
        if (leftHip.position.y > leftShoulder.position.y && 
            rightHip.position.y > rightShoulder.position.y) {
            poseNameText.innerText = 'Downward Dog';
            return;
        }
    }

    // Check for "Mountain Pose"
    if (leftShoulder.score > 0.5 && rightShoulder.score > 0.5 &&
        leftHip.score > 0.5 && rightHip.score > 0.5) {

        if (
            Math.abs(leftShoulder.position.x - rightShoulder.position.x) < 50 &&
            Math.abs(leftHip.position.x - rightHip.position.x) < 50 &&
            leftKnee.score <= 0.5 && rightKnee.score <= 0.5
        ) {
            poseNameText.innerText = 'Mountain Pose';
            return;
        }
    }

    poseNameText.innerText = 'Unknown Pose'; // Default case
}

// Draw the pose keypoints on the canvas
function drawPose(pose) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    pose.keypoints.forEach(keypoint => {
        if (keypoint.score > 0.5) {
            context.fillStyle = 'red';
            context.beginPath();
            context.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
            context.fill();
        }
    });
}

// Main function to run the setup and detection
async function main() {
    await startVideo();
    await loadPosenet();
    detectPose();
}

// Event listener for the capture button
captureButton.addEventListener('click', captureSnapshot);

// Run the main function when the window loads
window.onload = main;