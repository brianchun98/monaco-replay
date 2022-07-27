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
			var currInd = 0
			//Create array to store the resulting strings at each timeframe to use with slider
			const history = []
			//Initialize the array by putting an empty string as its first element so that when the slider is at 0, the displayed editor is empty
			history[0] = ""
			var intervalID = setInterval(function(){
				let operation = revisions[keys[currInd]]
				//Composes operations together to create the resulting string up to that point in order to display it
				document = document.compose(operation)
				//Makes slider move as the code-replay is being played and sets the displayed "timeframe" value to match progress
				slider.value = currInd + 1
				output.innerHTML = slider.value
				try{
					var strarr = document.toJSON()
					if (typeof strarr[0] === 'string' || strarr[0] instanceof String){
						editor.setValue(strarr[0])
						history[currInd+1] = strarr[0]
					}
					//Takes care of cases where an empty string(When there is nothing written on the editor i.e. when everything is deleted)
					//is represented as integer 0 rather than ""
					else if (strarr[0] === 0){
						editor.setValue("")
						history[currInd+1] = ""
					}
				}
				//Terminates the program when an error is raised
				catch(e){
					console.log(e)
					clearInterval(intervalID)
				}
				currInd++
				if (keys[currInd-1] === revision) {
					//Ends interval when operations until input timestamp are displayed
					clearInterval(intervalID)
					//Lets user use the slider to choose which timeframe of the code to view
					slider.oninput = function() {
  						output.innerHTML = this.value;
  						editor.setValue(history[this.value])
					}
				}
			//Integer parameter to control how slow/fast the replay will be displayed
			//1000 = update once per second (Lower numbers cause the replay to be faster)
			}, 200)				
		}
    }

init()