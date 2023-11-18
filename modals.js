class Modal {
    constructor(id) {
        if(!id){throw new Error('An ID is required to create a Modal.');}
        this.width = 30;
        this.top = 10;
        this.right = 10;
        this.z_index = 250;
        this.id = id;
        this.content_element = null; 
        this.modal_element = this.createModalElement();
    }

    createModalElement() {
        //construct base modal
        const modal = document.createElement('div'); 
        const close_button = document.createElement('button');
        const modal_content = document.createElement('div');
        
        modal.classList.add('modal');
        modal.style.display = 'none'; 
        modal.id = this.id;
        
        close_button.classList.add('close-button');
        close_button.innerHTML += "&#10006;";
        close_button.addEventListener('click', () => {this.close();});
        
        this.content_element = modal_content;
        modal_content.classList.add('modal-content');
        console.log(modal_content);
        console.log(this.content_element);
        
        modal.appendChild(close_button);
        modal.appendChild(modal_content);
        document.getElementById('modals-container').appendChild(modal);
        
        return modal;
    }
    
    //call after altering properties
    reloadProperties(){
        this.modal_element.style.width = `${this.width}%`;
        this.modal_element.style.top = `${this.top}%`;
        this.modal_element.style.right = `${this.right}%`;
        this.modal_element.style.zIndex = this.z_index;
    }

    setContent(html_content) {
        console.log(this.content_element);
        this.content_element.innerHTML = html_content; 
    }

    open() {
        this.modal_element.style.display = 'block'; 
    }

    close() {
        this.modal_element.style.display = 'none'; 
    }
}

// use on buttons, make data-modal = name of modal in object list, instantiate on page load
function showModal(event) {
    const button = event.target; // or event.currentTarget, based on specific implementation
    const modalKey = button.dataset.modal; 

    if (modals[modalKey]) {
        modals[modalKey].open();
    } else {
        console.error("Modal key not found:", modalKey);
    }
}

const modals = {
    settings: new Modal('settings'),
    saves_menu: new Modal('saves-menu'),
    import_export_menu: new Modal('import-export-menu'),
    palette_menu: new Modal('palette-menu')
}

modals.settings.reloadProperties();
modals.settings.setContent(`
<div class="button-container">
    <div class='add-task-div'>
        <button class="add-task-btn" id="main-task-add" data-task-id="0" data-branch="0" onclick="createTask(event)">New Task</button>
    </div>
    <div class='clipboard-div'>
        <button id='save-to-clipboard' onclick="saveData('clipboard')">Export to Clipboard</button>
        <button id='load-from-clipboard' onclick="importData('clipboard')">Import from Clipboard</button>
    </div>
    <div class='browser-div'>
        <button id='autosave' onclick="toggleAutosave()">Autosave: ✖</button>
        <button id='save-to-browser' onclick="saveData('browser')">Save to Browser</button>
        <button id='load-from-browser' onclick="importData('browser')">Load from Browser</button>
    </div>
    <div class="settings-div">
        <label for="toggle-hidden">Show Completed</label>
        <input type="checkbox" id="toggle-hidden" onclick="toggleShowCompleted()" />
    </div>
</div>
`)