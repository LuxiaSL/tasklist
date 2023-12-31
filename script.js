/*
todo: 
drag & drop

general modal for settings, import/export, etc.

save slot functionality; let people have infinite saves w/ names,  show in solo modal

styling button with clickable color swabs as selection and then a blank end (in the future) for a custom option which will generate based off their color choice (somehow? will ask AI to compile function based on multiple different themes)

details button, opens up large <area> below for extra details/description

mobile implementation after finishing the above
*/

// Initialize empty task array
let tasks = [{text:"", parent_task_id:null, id:0, subtasks:{complete:[],incomplete:[]}, complete:false, branch:'0', collapsed:false}];
// incrementer
let task_increment = 1;
// autosave enabled?
let autosave_enabled=false;
//completes?
let show_completed=true;

//template for the createTask and createDOMElement function; structure of the page
function generateTaskTemplate(task) {
    // Calculate depth and padding based on the branch
    let depth = task.branch.split(',').length - 1;
    depth = (depth >= 0 ? depth : 0);
    let padding = (depth <= 0 ? 0 : 2);

    return `
<div id='${task.id}' data-branch='${task.branch}' data-parent-task-id='${task.parent_task_id}'
    class='task-container ${task.collapsed ? 'is-collapsed' : ''}' style='padding-left:${padding}em'
    onclick="toggleTaskCollapse(event)" >
    <div class='task-content'>
        <div class='task-text'>
            <div class='task-checkbox'><input type='checkbox' class="task-toggle" data-task-id='${task.id}' ${task.complete ? 'checked' : ''} onclick='toggleTaskCompletion(event)' /></div>
            <input class="task-text-input" id='txt-${task.id}' data-task-id='${task.id}' type='text' value='${task.text}' disabled placeholder='...' onblur='editTaskText(event)' />
        </div>
        <div class='task-buttons'>
            <div class='edit-task-div'><button class='edit-task-btn' data-task-id='${task.id}' onclick='editTask(event)'>&#9998;</button></div>
            <div class='del-task-div'><button class='del-task-btn' data-task-id='${task.id}' data-primed='false' onclick='deleteTask(event)'>&#10006;</button></div>
            <button class='swap-button' data-raise='true' data-task-id='${task.id}' onclick='listenSwap(event)'>▲</button>
            <button class='swap-button' data-raise='false' data-task-id='${task.id}' onclick='listenSwap(event)'>▼</button>
        </div>
    </div>
    <div class='add-task-div ${task.collapsed ? 'collapsed' : ''}'><button class='add-task-btn' data-task-id='${task.id}' data-branch='${task.branch}' onclick='createTask(event)'>+ Add subtask...</button></div>
    <div class='subtasks ${task.collapsed ? 'collapsed' : ''}'>
        <div class='incompleted-tasks' id='sub-${task.id}' data-parent-task-id='${task.id}'></div>
        <div class='completed-tasks' id='comp-sub-${task.id}' data-parent-task-id='${task.id}'></div>
    </div>
</div>`;
}

// Function to create task and subtask
function createTask(e) {
	let btn = e.target;
	//new task +1
	let task_id = task_increment++; 
	//get parent id
	let parent_id = Number(btn.dataset.taskId);
	//make branch
	let new_branch = `${btn.dataset.branch},${task_id}`

    //ensure positive depth
	let depth = new_branch.split(',').length - 1;
	depth = (depth >= 0 ? depth : 0);

	//determine padding for task. if neg, set to 0.
	let padding = (depth <= 0 ? 0 : 2);

    // Create new task object
    let task_obj = {text:"", parent_task_id:parent_id, id:task_id, subtasks:{complete:[],incomplete:[]}, complete:false, branch:new_branch, collapsed:false};
	
	//task template
	const template = generateTaskTemplate(task_obj);

	//access parent DOM container and insert template
	document.getElementById(`sub-${parent_id}`).insertAdjacentHTML('beforeend', template);

    //put user in new task box
    document.getElementById(`txt-${task_id}`).disabled=false;
    document.getElementById(`txt-${task_id}`).focus();

    // Find the parent task object
	// if initial, special case
	if(parent_id==0){
		tasks[0].subtasks.incomplete.push(task_obj);
		return;
	}
	//else, continue on
    let parent_task = findTaskObject(parent_id, new_branch);
    if(parent_task === null) {
        console.log('Error: Parent task not found (ID: ' + parent_id + ')');
        return;
    }
    // Add the new task to the subtasks array of the parent task
    parent_task.subtasks.incomplete.push(task_obj);
	autosave();
}

//delete pushed; on one push, re-enable. second, delete task.
function deleteTask(e){
	let btn = e.target;
	if(btn.dataset.primed=="false"){
		//prime button
		btn.dataset.primed="true";
		btn.classList.add("delete-primed")
		setTimeout(() => {
			// Reset the primed attribute and remove the class
			btn.dataset.primed = "false";
			btn.classList.remove("delete-primed");
		  }, 2500);
	}else{
		//button enabled; do work
		//to delete, remove self from tasks, and pop out of DOM
		let task_id = Number(btn.dataset.taskId);
		let container_div = document.getElementById(task_id);
		let branch = container_div.dataset.branch;
		let parent_task_id = Number(container_div.dataset.parentTaskId);
		
		// Remove the task from the parent task's subtasks array
		let parent_task = findTaskObject(parent_task_id, branch);
		if(parent_task === null) {
			console.log('Error: Parent task not found (ID: ' + parent_task_id + ')');
			return;
		}

        //determine container, then find it within
        let subtasks_container = (findTaskObject(task_id, branch).complete ? parent_task.subtasks.complete : parent_task.subtasks.incomplete);
		let index_to_remove = subtasks_container.findIndex(task => task.id === task_id);
		if (index_to_remove !== -1) {
			subtasks_container.splice(index_to_remove, 1);
		}
		// Remove the task from the DOM
		container_div.remove();
        //item removed, perform sort
        sortWithinBranchById(parent_task_id);
	}
}
//edit button clicked; re-enable the input box and focus
function editTask(e){
	let task_id = Number(e.target.dataset.taskId);
	document.getElementById(`txt-${task_id}`).disabled=false;
	document.getElementById(`txt-${task_id}`).focus();
}

//input was blurred; update tasks object with new value, disable input again
function editTaskText(e){
	let text_input = e.target;
	let task_id = Number(text_input.dataset.taskId);
	text_input.disabled=true;
	let branch = document.getElementById(task_id).dataset.branch;
	modifyTaskObject(task_id, branch, 'text', text_input.value);
}

//functions to listen & shift according to which button was clicked & where
function listenSwap(e){
    let btn = e.target;
    if(e.shiftKey){
        swapTask(btn, 'shift');
    }else if(e.ctrlKey){
        swapTask(btn, 'ctrl');
    }else{
        swapTask(btn, 'normal');
    }
}

function swapTask(btn, swapType) {
    //variable declarations
    let task_id = Number(btn.dataset.taskId);
    let shift_up = btn.dataset.raise == 'true';
    let element = document.getElementById(task_id);
    let parent_element = document.getElementById(element.dataset.parentTaskId);
    let parent_task = findTaskObject(Number(parent_element.id), parent_element.dataset.branch);
    let task_to_shift = findTaskObject(task_id, element.dataset.branch);
    let subtasks_array = (task_to_shift.complete ? parent_task.subtasks.complete : parent_task.subtasks.incomplete);

    let index = subtasks_array.findIndex(t => t.id === task_id);

    switch(swapType) {
        case 'shift':
            // Logic for moving the task by 4 positions (5 feels weird)
            if (shift_up) {
                let newPos = Math.max(index - 4, 0); // Ensure newPos doesn't go below 0
                let [removed] = subtasks_array.splice(index, 1);
                subtasks_array.splice(newPos, 0, removed);
            } else {
                let newPos = Math.min(index + 4, subtasks_array.length - 1); // Ensure newPos doesn't exceed array length
                let [removed] = subtasks_array.splice(index, 1);
                subtasks_array.splice(newPos, 0, removed);
            }
            break;
        case 'ctrl':
            // Logic for moving the task to top/bottom
            if (shift_up) {
                let [removed] = subtasks_array.splice(index, 1);
                subtasks_array.unshift(removed); // Move to top
            } else {
                let [removed] = subtasks_array.splice(index, 1);
                subtasks_array.push(removed); // Move to bottom
            }
            break;
        case 'normal':
            // Existing shifting logic
            if(shift_up && index > 0){
                let [removed] = subtasks_array.splice(index, 1);
                subtasks_array.splice(index - 1, 0, removed);
            } else if(!shift_up && index < subtasks_array.length - 1){
                let [removed] = subtasks_array.splice(index, 1);
                subtasks_array.splice(index + 1, 0, removed);
            }
            break;
    }

    // Existing sort and error handling
    try {
        sortWithinBranchById(parent_task.id);
    } catch {
        console.log("Error: Sort operation failed (ID: " + parent_task.id + ")");
        return;
    }
}

// This function toggles the collapsed state of a task
function toggleTaskCollapse(e) {
    e.stopPropagation();
    // Check if the click was on the left side of the div
    if (e.offsetX <= 5) {
        let container_div = e.target;
        let task_id = Number(container_div.id);
        let branch = container_div.dataset.branch;
        let task_obj  = findTaskObject(task_id, branch);
        let subtask_div = container_div.querySelector('.subtasks');
        let add_task_div = container_div.querySelector('.add-task-div');

        //wants to alternate based on initial value
        if(task_obj.collapsed){
            modifyTaskObject(task_id, branch, 'collapsed', false);
        }else{
            modifyTaskObject(task_id, branch, 'collapsed', true);
        }

        //proceed to toggle
        subtask_div.classList.toggle('collapsed');
        add_task_div.classList.toggle('collapsed');
        container_div.classList.toggle('is-collapsed');

        autosave();
    }
}


//checkbox clicked; if checked, hide task. if unchecked, unhide task.
function toggleTaskCompletion(e){
	let check = e.target;
	let task_id = Number(check.dataset.taskId);
	let container_div = document.getElementById(task_id);
	let branch = container_div.dataset.branch;
    let parent_task_id = Number(container_div.dataset.parentTaskId);
    let parent_task_subtasks = findTaskObjectNoBranch(parent_task_id).subtasks

	if(check.checked){
		container_div.classList.add("complete");
		modifyTaskObject(task_id, branch, 'complete', true);

        let index = parent_task_subtasks.incomplete.findIndex(t => t.id === task_id);
        let [moved_task] = parent_task_subtasks.incomplete.splice(index, 1);
        parent_task_subtasks.complete.push(moved_task);

		document.getElementById('comp-sub-' + parent_task_id).appendChild(container_div);
	}else{
		container_div.classList.remove("complete");
		modifyTaskObject(task_id, branch, 'complete', false);

        let index = parent_task_subtasks.complete.findIndex(t => t.id === task_id);
        let [moved_task] = parent_task_subtasks.complete.splice(index, 1);
        parent_task_subtasks.incomplete.push(moved_task);

		document.getElementById('sub-' + parent_task_id).appendChild(container_div);
	}

    autosave();
}

//self explanatory; flip state of showing completed tasks, add/remove hidden
function toggleShowCompleted(){
	show_completed = !show_completed;
	if (show_completed) {
		document.getElementById(0).querySelectorAll('.completed-tasks').forEach(task => {task.classList.remove('hidden');});
	} else {
		document.getElementById(0).querySelectorAll('.completed-tasks').forEach(task => {task.classList.add('hidden')});
	}
	autosave();
}

//alter the overall tasks object
function modifyTaskObject(task_id, branch_str, property_to_edit, value){
    // Find the task object
    let task_to_edit = findTaskObject(task_id, branch_str);
    if(task_to_edit === null) {
        console.log('Error: Task not found (ID: ' + task_id + ')');
        return;
    }
    // Modify the property of the task object, and sort the modified task
    task_to_edit[property_to_edit] = value;
    sortWithinBranchById(task_to_edit.parent_task_id);
}

// Function to find a task object
function findTaskObject(task_id, branch_str) {
    // Split the branch string into an array of numbers
    let branch_array = branch_str.split(',').map(Number);
    // Start from the main tasks
    let current_task = tasks[0].subtasks;

    // Traverse the branch
    for(let i = 1; i < branch_array.length; i++) {
        //i is current branch depth
        let found = false;
        
        // Search within incomplete
        for (let j = 0; j < current_task.incomplete.length; j++) {
            //if id matches curr branch
            if (current_task.incomplete[j].id === branch_array[i]) {
                // If the current node is the task we're looking for, return it
                if(current_task.incomplete[j].id === task_id) {
                    return current_task.incomplete[j];
                }
                //else, continue on
                current_task = current_task.incomplete[j].subtasks;
                found = true;
                break;
            }
        }

        // Search within complete if not found in incomplete
        if (!found) {
            for (let j = 0; j < current_task.complete.length; j++) {
                //if id matches curr branch
                if (current_task.complete[j].id === branch_array[i]) {
                    // If the current node is the task we're looking for, return it
                    if(current_task.complete[j].id === task_id) {
                        return current_task.complete[j];
                    }
                    //else, continue on
                    current_task = current_task.complete[j].subtasks;
                    found = true;
                    break;
                }
            }
        }
        
        //somehow didn't find, go next function
        if(!found) {
            console.log('Error: Invalid branch array, trying other search (ID: ' + task_id + ')');
			return findTaskObjectNoBranch(task_id);
        }
    }
    //failure happened, try next function
    console.log('Error: Task ID not found in the last branch, trying other search (ID: ' + task_id + ')');
    return findTaskObjectNoBranch(task_id);
}
//alternate function to find without branch if fails out
function findTaskObjectNoBranch(task_id) {
    // Check if tasks array is empty
    if (tasks.length === 0) {
        console.log('Error: Tasks array is empty (ID: ' + task_id + ')');
        return null;
    }

    // Check if task_id is not a number or is not defined
    if (typeof task_id !== 'number' || typeof task_id === 'undefined') {
        console.log('Error: Invalid task_id (ID: ' + task_id + ')');
        return null;
    }

	if(task_id==0){
		return tasks[0];
	}

    // Recursive function to search through the tasks object
    function searchTasks(tasks) {
        // Check if tasks is not an array or is not defined
        if (!Array.isArray(tasks) || typeof tasks === 'undefined') {
            console.log('Error: Invalid tasks array (Arr: ' + tasks + ')');
            return null;
        }

        for (let i = 0; i < tasks.length; i++) {
            // Check if id property is not a number or is not defined
            if (typeof tasks[i].id !== 'number' || typeof tasks[i].id === 'undefined') {
                console.log('Error: Invalid task object (Obj: ' + tasks[i] + ')');
                continue;
            }

            //if this is the one, return it finally
            if (tasks[i].id === task_id){return tasks[i]}

            //if not, run through both the complete&incomplete of this task's subsets
            if (tasks[i].subtasks.incomplete.length > 0) {
                const result = searchTasks(tasks[i].subtasks.incomplete);
                if (result){return result}
            }

            if (tasks[i].subtasks.complete.length > 0) {
                const result = searchTasks(tasks[i].subtasks.complete);
                if (result){return result}
            }

        }

        return null; // Task never found
    }

    // Initialize the search on both completed and incomplete subtasks from the root
    const resultFromIncomplete = searchTasks(tasks[0].subtasks.incomplete);
    if (resultFromIncomplete) {
        return resultFromIncomplete;
    }
    return searchTasks(tasks[0].subtasks.complete);
}

//single branch search. given a parent task's id, traverses to element, sorts explicitly within its comp/incomp subtasks, no recursive
//use with any user alteration, not on load.
function sortWithinBranchById(parent_id_trigger) {
    //take in parent ID, locate
    function findIndexById(task_id, subtasks_array) {
        return subtasks_array.findIndex(task => task.id === task_id);
    }

    function compare(a, b, subtasks_array) {
        const idA = parseInt(a.id);
        const idB = parseInt(b.id);

        const indexA = findIndexById(idA, subtasks_array);
        const indexB = findIndexById(idB, subtasks_array);

        if (indexA < indexB) return -1;
        if (indexA > indexB) return 1;
        return 0;
    }

    // given task's id, find parent task to sort within
    let parent_task_element = document.getElementById(parent_id_trigger);
    
    // Check if parent task exists
    if (!parent_task_element) {
      console.log("Error: Parent task not found (ID: " + parent_id_trigger + ")");
      return;
    }

    let parent_task_object = findTaskObjectNoBranch(parent_id_trigger);
    let incomp_subtasks = parent_task_object.subtasks.incomplete;
    let comp_subtasks = parent_task_object.subtasks.complete;

    //have element; sort both subtask arrays within; first incompletes, then completes
    let incomp_elements = parent_task_element.querySelector('.incompleted-tasks')
    //access overall subtasks container, make array from children, sort and replace
    let incomp_array = Array.from(incomp_elements.children);
    incomp_array.sort((a, b) => compare(a, b, incomp_subtasks));
    incomp_array.forEach(subtask => {
        incomp_elements.appendChild(subtask);
    });

    //now, complete tasks
    let comp_elements = parent_task_element.querySelector('.completed-tasks');
    let comp_array = Array.from(comp_elements.children);
    comp_array.sort((a, b) => compare(a, b, comp_subtasks));
    comp_array.forEach(subtask => {
        comp_elements.appendChild(subtask);
    });

	autosave();
}
  

// sort ALL tasks and subtasks (only perform on load)
function sortAllTasks() {
    const mainContainer = document.getElementById("0"); 
    sortTasksRecursively(mainContainer, tasks[0].subtasks);

	autosave();
}

// helper function to recursively sort tasks and subtasks
function sortTasksRecursively(container, subtasks_object) {
    //take in ID, locate within given array
    function findIndexById(task_id, subtasks_array) {
        return subtasks_array.findIndex(task => task.id === task_id);
    }

    //sort based on found index
    function compare(a, b, subtasks_array) {
        const idA = parseInt(a.dataset.id);
        const idB = parseInt(b.dataset.id);

        const indexA = findIndexById(idA, subtasks_array);
        const indexB = findIndexById(idB, subtasks_array);

        if (indexA < indexB) return -1;
        if (indexA > indexB) return 1;
        return 0;
    }

    //sort incomplete tasks
    let incomp_elements = container.querySelector('.incompleted-tasks');
    let incomp_array = Array.from(incomp_elements.children);
    incomp_array.sort((a, b) => compare(a, b, subtasks_object.incomplete));
    incomp_array.forEach(subtask => {
        incomp_elements.appendChild(subtask);
    });

    //sort complete tasks
    let comp_elements = container.querySelector('.completed-tasks');
    let comp_array = Array.from(comp_elements.children);
    comp_array.sort((a, b) => compare(a, b, subtasks_object.complete));
    comp_array.forEach(subtask => {
        comp_elements.appendChild(subtask);
    });

    //recursively sort subtasks
    [...incomp_array, ...comp_array].forEach(subtask_set => {
        const subtasks_container = subtask_set.querySelector('.subtasks');
        if (subtasks_container) {
            const task_id = Number(subtask_set.id);
            const task_object = findTaskObjectNoBranch(task_id);
            sortTasksRecursively(subtasks_container, task_object.subtasks);
        }
    });
}

// Clears the main DOM container and repopulates it based on the 'tasks' array
function reloadTasks() {
    const mainContainer = document.getElementById('0');
    document.getElementById('comp-sub-0').innerHTML='';
    document.getElementById('sub-0').innerHTML='';
    tasks[0].subtasks.incomplete.forEach((task) => {
        createDOMElement(task, mainContainer);
    });
    tasks[0].subtasks.complete.forEach((task) => {
        createDOMElement(task, mainContainer);
    });
    sortAllTasks();
    if (show_completed) {
		document.getElementById(0).querySelectorAll('.completed-tasks').forEach(task => {task.classList.remove('hidden');});
	} else {
		document.getElementById(0).querySelectorAll('.completed-tasks').forEach(task => {task.classList.add('hidden')});
	}
}

// Helper function to create a DOM element for a task
function createDOMElement(task, parentElement) {
	//ensure positive depth
	let depth = task.branch.split(',').length - 1;
	depth = (depth >= 0 ? depth : 0);

	//determine padding for task. if neg, set to 0.
	let padding = (depth <= 0 ? 0 : 2);

    // Create a new task element using the same template as in 'createTask'
    const template = generateTaskTemplate(task);

    // Check for task completion status and append accordingly
    const sub_container_id = task.complete ? `comp-sub-${task.parent_task_id}` : `sub-${task.parent_task_id}`;
    const sub_container = parentElement.querySelector(`#${sub_container_id}`);
    sub_container.insertAdjacentHTML('beforeend', template);

    // Recurse through subtasks, if any
    if (task.subtasks.incomplete.length > 0) {
        task.subtasks.incomplete.forEach((subtask) => {
            createDOMElement(subtask, document.getElementById(task.id));
        });
    }
    if(task.subtasks.complete.length > 0){
        task.subtasks.complete.forEach((subtask) => {
            createDOMElement(subtask, document.getElementById(task.id));
        })
    }
}

//toggles autosave functionality, pass init when loading first time to bypass check and keep state
function toggleAutosave(init) {
	const autosaveButton = document.getElementById('autosave');

	if(init!=null){autosaveButton.textContent = 'Autosave: ✔';return;}

	if (autosave_enabled) {
		// Autosave is already enabled, so we need to disable it
		autosaveButton.classList.remove('enabled');
		autosaveButton.classList.add('disabled');
		autosaveButton.textContent = 'Autosave: ✖';
	} else {
		// Autosave is currently disabled, so we need to enable it
		autosaveButton.classList.remove('disabled');
		autosaveButton.classList.add('enabled');
		autosaveButton.textContent = 'Autosave: ✔';
	}
	//flip it
	autosave_enabled = !autosave_enabled;
	//save change
	saveData('browser');
	console.log('Saved');
}

//when toggled, edit/sort functions call this to save state
function autosave(){
	if(autosave_enabled){saveData('browser');console.log('Saved');}
}

// dynamic save data function, feed string for which, params for extra identifications, if needed (future slots prep)
function saveData(destination, params) {
    if (destination === 'clipboard') {
        const tasksJson = JSON.stringify({ tasks:tasks, task_increment:task_increment, autosave_enabled:autosave_enabled, show_completed:show_completed });
        const base64TasksJson = btoa(tasksJson);
        // Save to clipboard
        navigator.clipboard.writeText(base64TasksJson).catch(() => {
            prompt("Unable to access clipboard. Manually copy the data below:", base64TasksJson);
        });
    } else if (destination === 'browser') {
        // Save to browser
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('task_increment', task_increment);
        localStorage.setItem('autosave_enabled', autosave_enabled);
		localStorage.setItem('show_completed', show_completed)
    }
}

// dynamic import function, feed string for source, params for extra info if needed
async function importData(source, params) {
    if (source == 'clipboard') {
        //clipboard import; wait for paste & decode
        let base64Json;
        try {
            base64Json = await navigator.clipboard.readText();
        } catch (err) {
            base64Json = prompt("Unable to access clipboard. Manually paste the JSON below:");
        }

        if (base64Json) {
            const decodedJson = atob(base64Json);
            const { 
				tasks: importedTasks, 
				task_increment: importedTaskIncrement, 
				autosave_enabled: importedAutosave, 
				show_completed: importedShowCompleted
			 } = JSON.parse(decodedJson);
            tasks = importedTasks;
            task_increment = importedTaskIncrement;
            autosave_enabled = importedAutosave;
			show_completed = importedShowCompleted;
        }
    } else if (source == 'browser') {
        if(localStorage.length > 0){
            // get all info from browser, type it
            tasks = JSON.parse(localStorage.getItem('tasks'));
            task_increment = Number(localStorage.getItem('task_increment'));
            autosave_enabled = localStorage.getItem('autosave_enabled') == 'true' ? true:false;
            show_completed = localStorage.getItem('show_completed') == 'true' ? true:false;
        }else{
            console.log("Error: Nothing in localStorage to load");
            return;
        }
    }

    //check if empty, if so, nothing was loaded. continue on.
    if (tasks[0].subtasks.length === 0) {
        console.log("Error: Loading may have failed. The 'tasks[0].subtasks' array is empty.");
        return;
    }

    //initialize
    autosave_enabled ? toggleAutosave(true) : null;
    reloadTasks();
}