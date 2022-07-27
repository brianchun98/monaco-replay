function init() {
        //// Initialize Firebase.
        //// Input Firebase configuration (Important: apiKey, authDomain, databaseURL)
        var config = {
        		databaseURL: "https://monaco-wslide-default-rtdb.firebaseio.com/",
  				apiKey: "AIzaSyDbdAb25CbJm9ud3klWnLM7FLI6-PrM4SA",
  				authDomain: "monaco-wslide.firebaseapp.com",
  				projectId: "monaco-wslide",
  				storageBucket: "monaco-wslide.appspot.com",
  				messagingSenderId: "368226361873",
  				appId: "1:368226361873:web:f440dae97d5e2de0c2c7b0",
  				measurementId: "G-6RN04T3Y7R"
        };
        firebase.initializeApp(config);

        //// Get Firebase Database reference.
        var firebaseRef = firebase.database().ref();
        
        var firepad;
        var editor;
        
        //Initialize slider
        var slider = document.getElementById("myRange");
		var output = document.getElementById("demo");
		output.innerHTML = slider.value;
		
		var startbtn = document.getElementById("PlayBtn");
		var stopbtn = document.getElementById("StopBtn");
		var fastbtn = document.getElementById("FastBtn");
		var resetbtn = document.getElementById("NormBtn");
		var slowbtn = document.getElementById("SlowBtn");
		var playspeed = document.getElementById("speed");
		
		//Creates firepad instance using monaco editor and runs the code-replay  
        require.config({ paths: {'vs': './node_modules/monaco-editor/min/vs'}});
        require(['vs/editor/editor.main'], function() {
            editor = monaco.editor.create(
                document.getElementById('firepad'),
                {
                    language: 'javascript'
                }
            );
            firepad = Firepad.fromMonaco(firebaseRef, editor);
            firepad.on('ready', function () {
			  fetchRevisions(firebaseRef, revisionInfo => {
				// timestamp = parameter indicating at which 'timestamp' we wish to replay inputs until
			    const timestamp = "1658796015915"
			    textForRevision(timestamp, revisionInfo)
			  	})
			})
        });
    	
		// Fetches revisions from indicated firebase reference, and returns an object where keys = timestamps, values = operations
		const fetchRevisions = async (firebaseRef, callback) => {
			firebaseRef.child('history').once("value", function (snapshot) {
			const revisions = snapshot.val()
			var revisionsByTimestamp = {}
			for (var key of Object.keys(revisions)) {
					const revision = revisions[key]
					const operation = Firepad.TextOperation.fromJSON(revision.o)
					revisionsByTimestamp[`${revision.t}`] = operation
			}
			callback(revisionsByTimestamp)
			})
		}
		
		//Uses the fetched revisions to actually replay the code
		const textForRevision = (revision, revisions) => {
			var document = new Firepad.TextOperation()
			const keys = Object.keys(revisions).sort()
			//Sets slider length match the number of "timeframes" in this instance of replay
			slider.max = keys.indexOf(revision) + 1
			//Create array to store the resulting strings at each timeframe to use with slider
			const history = []
			//Initialize the array by putting an empty string as its first element so that when the slider is at 0, the displayed editor is empty
			history[0] = ""
			for(let i = 0; i < keys.indexOf(revision) + 1; i++){
				let operation = revisions[keys[i]]
				//Composes operations together to create the resulting string up to that point in order to display it
				document = document.compose(operation)
				var strarr = document.toJSON()
				if (typeof strarr[0] === 'string' || strarr[0] instanceof String){
					history[i+1] = strarr[0]
				}
				//Takes care of cases where an empty string(When there is nothing written on the editor i.e. when everything is deleted)
				//is represented as integer 0 rather than ""
				else{
					history[i+1] = ""
				}
			}
			//Initialize the editor so that it displays a blank editor
			editor.setValue(history[slider.value])
			//Let the displayed code change based on the position of the slider
			slider.oninput = function() {
  					output.innerHTML = this.value;
  					editor.setValue(history[this.value])
			}
			var timing = 200
			playspeed.innerHTML = timing
			fastbtn.onclick = function(){
				if(timing > 110){
					timing -= 100
					playspeed.innerHTML = timing
				}
			}
			slowbtn.onclick = function(){
				if(timing <1500){
					timing += 100
					playspeed.innerHTML = timing
				}
			}
			resetbtn.onclick = function(){
				timing = 200
				playspeed.innerHTML = timing
			}
			startbtn.onclick = function(){
				startbtn.disabled = true
				var checker = true
				var timeoutID = setTimeout(function loop(){
					slider.value++
					output.innerHTML = slider.value
					var timenow = slider.value
					editor.setValue(history[timenow])
					//Ends the code-replay when edit history has been shown to the point indicated by the input timestamp
					if(timenow == slider.max){
						startbtn.disabled = false
						checker = false
					}
					//Make the code-replay stop when the "stop" button is clicked
					stopbtn.onclick = function(){
						startbtn.disabled = false
						checker = false
					}
					if(checker){
						setTimeout(loop, timing)
					}
				//Integer parameter to control how slow/fast the replay will be displayed
				//1000 = update once per second (Lower numbers cause the replay to be faster)	
				}, timing)
			}		
		}
    }

init()