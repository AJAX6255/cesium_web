import React from 'react'
import ReactDOM from 'react-dom'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import FileInput from 'react-file-input'
import ReactTabs from 'react-tabs'
import CheckboxGroup from 'react-checkbox-group'

var Tab = ReactTabs.Tab;
var Tabs = ReactTabs.Tabs;
var TabList = ReactTabs.TabList;
var TabPanel = ReactTabs.TabPanel;

import _ from 'underscore'
import filter from 'filter-values'

import 'bootstrap-css'
import 'bootstrap'


import { Provider } from 'react-redux'
import configureStore from './configureStore'

import * as Action from './actions';


const store = configureStore()

import WebSocket from './WebSocket'
import MessageHandler from './MessageHandler'
let messageHandler = (new MessageHandler(store.dispatch)).handle;


import ProjectList from './ProjectList'
import DatasetsTab from './Datasets'
import FeaturesTab from './Features'
import { FormInputRow, FormSelectInput, FormTitleRow } from './Form'


function json_post(url, body) {
  return fetch('/newProject', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: body,
  });
}

var MainContent = React.createClass({
  getInitialState: function() {
    return {
      forms: {
        newProject:
        {
          'Project Name': '',
          'Description/notes': ''
        },
        newDataset:
        {
          'Select Project': '1',
          'Dataset Name': '',
          'Header File': '',
          'Tarball Containing Data': ''
        },
        featurize:
        {
          'Select Project': '',
          'Select Dataset': '',
          'Feature Set Title': '',
          'Custom Features File': '',
          'Custom Features Script Tested': false,
          'Selected Features': [],
          'Custom Features List': []
        },
        selectedProjectToEdit:
        {
          'Description/notes': '',
          'Project Name': ''
        }
      },
      available_features:
      {
        obs_features: {'feat1': 'checked'},
        sci_features: {'feat1': 'checked'}
      },
      projectsList: [],
      datasetsList: []
    };
  },
  componentDidMount: function() {
    this.loadState();
  },
  loadState: function() {
    store.dispatch(Action.fetchProjects());
  },
  updateProjectList: function() {
    $.ajax({
      url: '/project',
      dataType: 'json',
      type: 'GET',
      success: function(data) {
        var form_state = this.state.forms;
        form_state.newProject = this.getInitialState().forms.newProject;
        this.setState(
          {
            projectsList: data.data,
            forms: form_state
          });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/project', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  handleNewProjectSubmit: function(e) {
    e.preventDefault();
    $.ajax({
      url: '/project',
      dataType: 'json',
      type: 'POST',
      data: this.state.forms.newProject,
      success: function(data) {
        this.updateProjectList();
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/project', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  handleClickEditProject: function(projectID, e) {
    $.ajax({
      url: '/project/' + projectID,
      dataType: 'json',
      cache: false,
      type: 'GET',
      success: function(data) {
        var projData = {};
        projData['Project Name'] = data.data['name'];
        projData['Description/notes'] = data.data['description'];
        projData['project_id'] = projectID;
        var form_state = this.state.forms;
        form_state['selectedProjectToEdit'] = projData;
        this.setState({forms: form_state});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/project', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  updateProjectInfo: function(e) {
    e.preventDefault();
    $.ajax({
      url: '/project',
      dataType: 'json',
      type: 'POST',
      data: this.state.forms.selectedProjectToEdit,
      success: function(data) {
        var form_state = this.state.forms;
        form_state.selectedProjectToEdit = this.getInitialState().forms.selectedProjectToEdit;
        this.setState({projectsList: data, forms: form_state});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/project', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  handleDeleteProject: function(projectID, e) {
    $.ajax({
      url: '/project/' + projectID,
      dataType: 'json',
      type: 'DELETE',
      success: function(data) {
        this.updateProjectList();
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/project', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  handleNewDatasetSubmit: function(e){
    e.preventDefault();
    var formData = new FormData();
    for (var key in this.state.forms.newDataset) {
      formData.append(key, this.state.forms.newDataset[key]);
    }
    $.ajax({
      url: '/dataset',
      dataType: 'json',
      type: 'POST',
      contentType: false,
      processData: false,
      data: formData,
      success: function(data) {
        this.loadState();
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/dataset', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  onFeaturesDialogMount: function() {
    $.ajax({
      url: '/features_list',
      dataType: 'json',
      cache: false,
      success: function(data) {
        var obs_features_dict = _.object(
          _.map(data.data['obs_features'], function(feat) {
            return [feat, 'checked']; }));
        var sci_features_dict = _.object(
          _.map(data.data['sci_features'], function(feat) {
            return [feat, 'checked']; }));
        this.setState(
          {
            available_features:
            {
              obs_features: obs_features_dict,
              sci_features: sci_features_dict
            }
          });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('/features_list', status, err.toString(),
                xhr.repsonseText);
      }.bind(this)
    });
  },
  updateSeldObsFeats: function(sel_obs_feats) {
    var obs_feats_dict = this.state.available_features.obs_features;
    for (var k in this.state.available_features.obs_features) {
      obs_feats_dict[k] = (sel_obs_feats.indexOf(k) == -1) ? 'unchkd' : 'checked';
    }
    this.setState(
      {
        available_features:
        {
          obs_features: obs_feats_dict,
          sci_features: this.state.available_features.sci_features
        }
      });
  },
  updateSeldSciFeats: function(sel_sci_feats) {
    var sci_feats_dict = this.state.available_features.sci_features;
    for (var k in this.state.available_features.sci_features) {
      sci_feats_dict[k] = (sel_sci_feats.indexOf(k) == -1) ? 'unchkd' : 'checked';
    }
    this.setState(
      {
        available_features: {
          sci_features: sci_feats_dict,
          obs_features: this.state.available_features.obs_features
        }
      });
  },
  testCustomFeatScript: function (e) {
    // TODO: DO STUFF HERE
    console.log('testCustomFeatScript called... Nothing here yet.');
  },
  handleInputChange: function(inputName, inputType, formName, e) {
    var form_state = this.state.forms;
    if (inputType == 'file') {
      var newValue = e.target.files[0];
    } else {
      var newValue = e.target.value;
    }
    form_state[formName][inputName] = newValue;
    this.setState({forms: form_state});
  },
  render: function() {
    return (
      <div className='mainContent'>
        <Tabs classname='first'>
          <TabList>
            <Tab>Projects</Tab>
            <Tab>Data</Tab>
            <Tab>Features</Tab>
            <Tab>Models</Tab>
            <Tab>Predict</Tab>
          </TabList>
          <TabPanel>
            <ProjectsTabContent
              getInitialState={this.getInitialState}
              loadState={this.loadState}
              handleNewProjectSubmit={this.handleNewProjectSubmit}
              handleClickEditProject={this.handleClickEditProject}
              handleDeleteProject={this.handleDeleteProject}
              handleInputChange={this.handleInputChange}
              formFields={this.state.forms.newProject}
              projectsList={this.state.projectsList}
              projectDetails={this.state.forms.selectedProjectToEdit}
              updateProjectInfo={this.updateProjectInfo}
            />
          </TabPanel>
          <TabPanel>
            <DatasetsTab
              getInitialState={this.getInitialState}
              loadState={this.loadState}
              handleNewDatasetSubmit={this.handleNewDatasetSubmit}
              handleInputChange={this.handleInputChange}
              formFields={this.state.forms.newDataset}
              formName='newDataset'
              projectsList={this.state.projectsList}
              datasetsList={this.state.datasetsList}
            />
          </TabPanel>
          <TabPanel>
            <FeaturesTab
              getInitialState={this.getInitialState}
              loadState={this.loadState}
              handleNewDatasetSubmit={this.handleNewDatasetSubmit}
              handleInputChange={this.handleInputChange}
              formFields={this.state.forms.featurize}
              projectsList={this.state.projectsList}
              datasetsList={this.state.datasetsList}
              available_features={this.state.available_features}
              updateSeldObsFeats={this.updateSeldObsFeats}
              updateSeldSciFeats={this.updateSeldSciFeats}
              onFeaturesDialogMount={this.onFeaturesDialogMount}
              testCustomFeatScript={this.testCustomFeatScript}
            />
          </TabPanel>
          <TabPanel>
            Models...
          </TabPanel>
          <TabPanel>
            Predictions...
          </TabPanel>
        </Tabs>
      </div>
    );
  }
});

var ProjectsTabContent = React.createClass({
  render: function() {
    return (
      <div className='projectsTabContent'>
        <NewProjectForm
          handleInputChange={this.props.handleInputChange}
          formFields={this.props.formFields}
          handleSubmit={this.props.handleNewProjectSubmit}
        />
        <ProjectList
          projectsList={this.props.projectsList}
          clickEditProject={this.props.handleClickEditProject}
          deleteProject={this.props.handleDeleteProject}
          projectDetails={this.props.projectDetails}
          handleInputChange={this.props.handleInputChange}
          updateProjectInfo={this.props.updateProjectInfo}
        />
      </div>
    );
  }
});

var NewProjectForm = React.createClass({
  render: function() {
    return (
      <div className='formTableDiv' data-test-name='newProjectForm'>
        <FormTitleRow formTitle='Create a new project'
        />
        <FormInputRow
          inputName='Project Name'
          inputTag='input'
          inputType='text'
          formName='newProject'
          value={this.props.formFields['Project Name']}
          handleInputChange={this.props.handleInputChange}
        />
        <FormInputRow
          inputName='Description/notes'
          inputTag='textarea'
          formName='newProject'
          value={this.props.formFields['Description/notes']}
          handleInputChange={this.props.handleInputChange}
        />
        <div className='submitButtonDiv' style={{marginTop: 15}}>
          <input
            type='submit'
            onClick={this.props.handleSubmit}
            value='Submit'
            className='submitButton'
          />
        </div>
      </div>
    );
  }
});


var FeaturesTabContent = React.createClass({
  render: function() {
    return (
      <div className='featuresTabContent'>
        <FeaturizeForm
          handleInputChange={this.props.handleInputChange}
          formFields={this.props.formFields}
          handleSubmit={this.props.handleNewDatasetSubmit}
          datasetsList={this.props.datasetsList}
          featuresetsList={this.props.featuresetsList}
          projectsList={this.props.projectsList}
          formName={this.props.formName}
          available_features={this.props.available_features}
          updateSeldObsFeats={this.props.updateSeldObsFeats}
          updateSeldSciFeats={this.props.updateSeldSciFeats}
          onFeaturesDialogMount={this.props.onFeaturesDialogMount}
          testCustomFeatScript={this.props.testCustomFeatScript}
        />
      </div>
    );
  }
});


var FeaturizeForm = React.createClass({
  render: function() {
    return (
      <div className='formTableDiv'>
        <form id='featurizeForm' name='featurizeForm'
            action='/FeaturizeData' enctype='multipart/form-data'
            method='post'>
          <FormTitleRow formTitle='Featurize Data'/>
          <FormSelectInput inputName='Select Project'
                   inputTag='select'
                   formName='featurize'
                   optionsList={this.props.projectsList}
                   value={this.props.formFields['Select Project']}
                   handleInputChange={this.props.handleInputChange}
          />
          <FormSelectInput inputName='Select Dataset'
                   inputTag='select'
                   formName='featurize'
                   optionsList={this.props.datasetsList}
                   value={this.props.formFields['Select Dataset']}
                   handleInputChange={this.props.handleInputChange}
          />
          <FormInputRow inputName='Feature Set Title'
                  inputTag='input'
                  inputType='text'
                  formName='featurize'
                  value={this.props.formFields['Dataset Name']}
                  handleInputChange={this.props.handleInputChange}
          />

          <div className='submitButtonDiv' style={{marginTop: 15}}>
            <input type='submit'
                 onClick={this.props.handleSubmit}
                 value='Submit'
                 className='submitButton'
            />
          </div>
        </form>
        <h4>Select Features to Compute (TODO: Make this a pop-up dialog)</h4>
        <FeatureSelectionDialog
          available_features={this.props.available_features}
          updateSeldObsFeats={this.props.updateSeldObsFeats}
          updateSeldSciFeats={this.props.updateSeldSciFeats}
          onFeaturesDialogMount={this.props.onFeaturesDialogMount}
          handleInputChange={this.props.handleInputChange}
          testCustomFeatScript={this.props.testCustomFeatScript}
        />

      </div>
    );
  }
});


var FeatureSelectionDialog = React.createClass({
  componentDidMount: function () {
    this.props.onFeaturesDialogMount();
  },
  updateObsFeats: function (seld_obs_feats) {
    this.props.updateSeldObsFeats(seld_obs_feats);
  },
  updateSciFeats: function (seld_sci_feats) {
    this.props.updateSeldSciFeats(seld_sci_feats);
  },
  render: function() {
    return (
      <Tabs classname='second'>
        <TabList>
          <Tab>Feature Set 1</Tab>
          <Tab>Feature Set 2</Tab>
          <Tab>Custom Features</Tab>
        </TabList>
        <TabPanel>
          <CheckboxGroup
            name='obs_feature_selection'
            value={Object.keys(filter(
                this.props.available_features['obs_features'], 'checked'))}
            onChange={this.updateObsFeats}
          >
            { Checkbox => (
                <form>
                  {
                    Object.keys(this.props.available_features.obs_features).map(title =>
                      (
                        <div key={title}><Checkbox value={title}/> {title}</div>
                      )
                    )
                  }
                </form>
              )
            }
          </CheckboxGroup>
        </TabPanel>
        <TabPanel>
          <CheckboxGroup
            name='sci_feature_selection'
            value={Object.keys(filter(
                this.props.available_features['sci_features'], 'checked'))}
            onChange={this.updateSciFeats}
          >
            { Checkbox => (
                <form>
                  {
                    Object.keys(this.props.available_features.sci_features).map(title =>
                      (
                        <div key={title}><Checkbox value={title}/> {title}</div>
                      )
                    )
                  }
                </form>
              )
            }
          </CheckboxGroup>
        </TabPanel>
        <TabPanel>
          Select Python file containing custom feature definitions:
          <br /><br />
          <div id='script_file_input_div'>
            <FileInput name='Custom Features File'
                   placeholder='Select .py file'
                   onChange={this.props.handleInputChange.bind(
                       null, 'Custom Features File',
                       'file', 'featurize')}
            />
          </div>
          <br />
          <div>
            <input type='button'
                 onClick={this.props.testCustomFeatScript}
                 value='Click to test' />
          </div>
          <div id='file_upload_message_div'></div>
        </TabPanel>
      </Tabs>
    );
  }
});


ReactDOM.render(
  <Provider store={store}>
  <MainContent />
  </Provider>,
  document.getElementById('content')
);
