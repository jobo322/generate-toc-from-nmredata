'use strict';

const { join } = require('path');
const { getToc } = require('./getTocWorker');
const { parseSDF, NmrRecord } = require('nmredata');
const { fileListFromPath } = require('filelist-from');
const { signalsToRanges } = require('nmr-processing');
const { Molecule: OCLMolecule } = require('openchemlib/core');
const { getGroupedDiastereotopicAtomIDs } = require('openchemlib-utils');
const { writeFileSync } = require('fs');

const { parse, stringify } = JSON;

const pathToFiles = join(__dirname, '../data/');
const pathToWrite = join(__dirname, '../');

const fileList = fileListFromPath(pathToFiles);

(async (fileList) => {
  const toc = [];
  for (const file of fileList) {
    const sdfData = await file.text();
    const sdf = parseSDF(sdfData);
    const { molecules, ...restMainSDF } = sdf;
    toc.push(getToc({ molecules, restMainSDF }))
  }

  writeFileSync(join(pathToWrite, 'toc_nmrshiftDB.json'), JSON.stringify(toc));
})(fileList)
