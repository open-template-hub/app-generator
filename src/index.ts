#!/usr/bin/env node

/**
 * @description holds the project generator
 */

import colors from 'colors';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { ncp } from 'ncp';
import * as path from 'path';
import rmdir from 'rimraf';
import * as shell from 'shelljs';
import yargs from 'yargs/yargs';
import { BRANCH_NAME, PackageName, ProjectName, TEMPLATE_HUB_URL, TemplateType, } from './constant';

// Questions
const QUESTIONS = [
  {
    name: 'template',
    type: 'input',
    message:
        '1) Web UI \n' +
        '  2) Mobile Application \n' +
        '  3) Company Profile UI \n' +
        '  4) Admin UI \n' +
        '  Please enter the application type you want to generate: ',
    when: () => yargs().argv,
    validate: ( input: string ) => {
      if ( /^[1 | 2| 3| 4]$/.test( input ) ) return true;
      else
        return 'Please enter correct application type. Application type can be 1, 2, 3 or 4.';
    },
  },
  {
    name: 'name',
    type: 'input',
    message: 'Project name: ',
    when: () => yargs().argv,
    validate: ( input: string ) => {
      if ( /^([A-Za-z\-\_\d])+$/.test( input ) ) return true;
      else
        return 'Project name may only include letters, numbers, underscores and hashes.';
    },
  },
];

// current directory
const CURR_DIR = process.cwd();

// prompts questions to user
inquirer.prompt( QUESTIONS ).then( ( answers ) => {
  let userAnswers = Object.assign( {}, answers, yargs().argv );

  const projectName = userAnswers[ 'name' ];
  const targetPath = path.join( CURR_DIR, projectName );

  if ( !createProject( targetPath ) ) {
    return;
  }

  const templateType = userAnswers[ 'template' ];

  if ( !cloneTemplate( targetPath, templateType ) ) {
    console.error( colors.red( 'Can not clone the selected template.' ) );
    return;
  }

  if ( !updateProjectName( targetPath, templateType, projectName ) ) {
    console.error( colors.red( 'Can not set the project name.' ) );
    return;
  }

  if ( !postProcessNode( targetPath ) ) {
    return;
  }

  showMessage( projectName );
} );

interface RepoConfig {
  projectName: string,
  packageName: string
}

function updatePackageJson( targetPath: string, repoConfig: RepoConfig, projectName: string ) {
  let packageFile = path.join( targetPath, 'package.json' );

  fs.readFile( packageFile, 'utf8', function ( errReadFile, data ) {
    if ( errReadFile ) {
      return console.error( errReadFile );
    }

    let result = data.replace( repoConfig.packageName, projectName );

    fs.writeFile( packageFile, result, 'utf8', function ( errWriteFile ) {
      if ( errWriteFile ) {
        return console.error( errWriteFile );
      }
    } );
  } );
}

const updateProjectName = (
    targetPath: string,
    templateType: string,
    projectName: string
) => {

  let repoConfig: RepoConfig = {
    packageName: '',
    projectName: ''
  };

  shell.cd( targetPath );

  switch ( templateType ) {
    case TemplateType.WebUI:
      repoConfig.projectName = ProjectName.WebUI;
      repoConfig.packageName = PackageName.WebUI;
      break;
    case TemplateType.MobileUI:
      repoConfig.projectName = ProjectName.MobileUI;
      repoConfig.packageName = PackageName.MobileUI;
      break;
    case TemplateType.CompanyProfileUI:
      repoConfig.projectName = ProjectName.CompanyProfileUI;
      repoConfig.packageName = PackageName.CompanyProfileUI;
      break;
    case TemplateType.AdminUI:
      repoConfig.projectName = ProjectName.AdminUI;
      repoConfig.packageName = PackageName.AdminUI;
      break;
  }

  let oldPath = path.join( targetPath, repoConfig.projectName );

  ncp( oldPath, targetPath, function ( err ) {

    if ( err ) {
      return console.error( err );
    }

    rmdir( oldPath, ( errRmDir: any ) => {
      if ( errRmDir ) {
        return console.error( errRmDir );
      }
      updatePackageJson( targetPath, repoConfig, projectName );

      const gitFolderPath = path.join( targetPath, '.git' );

      rmdir( gitFolderPath, ( errRmDirInner: any ) => {

        if ( errRmDirInner ) {
          return console.error( errRmDirInner );
        }
      } );
    } );
  } );

  return true;
};

const cloneTemplate = ( targetPath: string, templateType: string ) => {
  shell.cd( targetPath );

  let cmd = '';
  let clone = 'git clone --progress -b ';

  switch ( templateType ) {
    case TemplateType.WebUI:
      cmd =
          clone + BRANCH_NAME + ' ' + TEMPLATE_HUB_URL + '/' + ProjectName.WebUI;
      break;
    case TemplateType.MobileUI:
      cmd =
          clone + BRANCH_NAME + ' ' + TEMPLATE_HUB_URL + '/' + ProjectName.MobileUI;
      break;
    case TemplateType.CompanyProfileUI:
      cmd =
          clone + BRANCH_NAME + ' ' + TEMPLATE_HUB_URL + '/' + ProjectName.CompanyProfileUI;
      break;
    case TemplateType.AdminUI:
      cmd =
          clone + BRANCH_NAME + ' ' + TEMPLATE_HUB_URL + '/' + ProjectName.AdminUI;
      break;
  }

  console.log( 'command: ', cmd );
  const result = shell.exec( cmd );

  return result.code === 0;
};

/**
 * shows message to user
 * @param projectName project name
 */
const showMessage = ( projectName: string ) => {
  console.log( '' );
  console.log( colors.green( 'Done.' ) );
  console.log( colors.green( `Go into the project: cd ${ projectName }` ) );
};

/**
 * creates project
 * @param projectPath project path
 * @returns true if folder does not already exist
 */
const createProject = ( projectPath: string ) => {
  if ( fs.existsSync( projectPath ) ) {
    console.error(
        colors.red( `Folder ${ projectPath } exists. Delete or use another name.` )
    );
    return false;
  }

  fs.mkdirSync( projectPath );
  return true;
};

/**
 * applies post process for node,
 * npm install etc.
 * @param targetPath target path
 */
const postProcessNode = ( targetPath: string ) => {
  shell.cd( targetPath );

  let cmd = '';

  if ( shell.which( 'yarn' ) ) {
    cmd = 'yarn';
  } else if ( shell.which( 'npm' ) ) {
    cmd = 'npm install';
  }

  if ( cmd ) {
    const result = shell.exec( cmd );

    if ( result.code !== 0 ) {
      return false;
    }
  } else {
    console.error( colors.red( 'No yarn or npm found. Cannot run installation.' ) );
  }

  return true;
};

