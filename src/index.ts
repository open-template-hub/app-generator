#!/usr/bin/env node

/**
 * @description holds the project generator
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { ncp } from 'ncp';
import * as path from 'path';
import rmdir from 'rimraf';
import * as shell from 'shelljs';
import yargs from 'yargs';
import { BRANCH_NAME, PackageName, ProjectName, TEMPLATE_HUB_URL, TemplateType, } from './constant';

// Questions
const QUESTIONS = [
  {
    name: 'template',
    type: 'input',
    message:
        '1) Web Application \n' +
        '  2) Mobile Application \n' +
        '  Please enter the application type you want to generate: ',
    when: () => !yargs.argv[ 'template' ],
    validate: ( input: string ) => {
      if ( /^[1 | 2]$/.test( input ) ) return true;
      else
        return 'Please enter correct application type. Application type can be 1 or 2.';
    },
  },
  {
    name: 'name',
    type: 'input',
    message: 'Project name: ',
    when: () => !yargs.argv[ 'template' ],
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
  let userAnswers = Object.assign( {}, answers, yargs.argv );

  const projectName = userAnswers[ 'name' ];
  const targetPath = path.join( CURR_DIR, projectName );

  if ( !createProject( targetPath ) ) {
    return;
  }

  const templateType = userAnswers[ 'template' ];

  if ( !cloneTemplate( targetPath, templateType ) ) {
    console.log( chalk.red( 'Can not clone the selected template.' ) );
    return;
  }

  if ( !updateProjectName( targetPath, templateType, projectName ) ) {
    console.log( chalk.red( 'Can not set the project name.' ) );
    return;
  }

  if ( !postProcessNode( targetPath ) ) {
    return;
  }

  showMessage( projectName );
} );

const updateProjectName = (
    targetPath: string,
    templateType: string,
    projectName: string
) => {
  let existingProjectName = '';
  let existingPackageName = '';

  shell.cd( targetPath );

  switch ( templateType ) {
    case TemplateType.WebUI:
      existingProjectName = ProjectName.WebUI;
      existingPackageName = PackageName.WebUI;
      break;
    case TemplateType.MobileUI:
      existingProjectName = ProjectName.MobileUI;
      existingPackageName = PackageName.MobileUI;
      break;
  }

  let oldPath = path.join( targetPath, existingProjectName );

  ncp( oldPath, targetPath, function ( err ) {
    if ( err ) {
      return console.log( err );
    } else {
      rmdir( oldPath, ( errRmDir: any ) => {
        if ( errRmDir ) {
          return console.log( errRmDir );
        } else {
          let packageFile = path.join( targetPath, 'package.json' );

          fs.readFile( packageFile, 'utf8', function ( errReadFile, data ) {
            if ( errReadFile ) {
              return console.log( errReadFile );
            }
            var result = data.replace( existingPackageName, projectName );

            fs.writeFile( packageFile, result, 'utf8', function ( errWriteFile ) {
              if ( errWriteFile ) return console.log( errWriteFile );
            } );
          } );
          const gitFolderPath = path.join( targetPath, '.git' );
          rmdir( gitFolderPath, ( errRmDirInner: any ) => {
            if ( errRmDirInner ) {
              return console.log( errRmDirInner );
            }
          } );
        }
      } );
    }
  } );

  return true;
};

const cloneTemplate = ( targetPath: string, templateType: string ) => {
  shell.cd( targetPath );

  let cmd = '';
  let clone = 'git clone -b ';

  switch ( templateType ) {
    case TemplateType.WebUI:
      cmd =
          clone + BRANCH_NAME + ' ' + TEMPLATE_HUB_URL + '/' + ProjectName.WebUI;
      break;
    case TemplateType.MobileUI:
      cmd =
          clone +
          BRANCH_NAME +
          ' ' +
          TEMPLATE_HUB_URL +
          '/' +
          ProjectName.MobileUI;
      break;
  }
  console.log( 'command: ', cmd );
  const result = shell.exec( cmd );

  if ( result.code !== 0 ) {
    return false;
  }

  return true;
};

/**
 * shows message to user
 * @param projectName project name
 */
const showMessage = ( projectName: string ) => {
  console.log( '' );
  console.log( chalk.green( 'Done.' ) );
  console.log( chalk.green( `Go into the project: cd ${ projectName }` ) );
};

/**
 * creates project
 * @param projectPath project path
 * @returns true if folder does not already exist
 */
const createProject = ( projectPath: string ) => {
  if ( fs.existsSync( projectPath ) ) {
    console.log(
        chalk.red( `Folder ${ projectPath } exists. Delete or use another name.` )
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
    console.log( chalk.red( 'No yarn or npm found. Cannot run installation.' ) );
  }

  return true;
};
