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

const pathToFiles = join(__dirname, '../dataTest/');
const pathToWrite = join(__dirname, '../');

const fileList = fileListFromPath(pathToFiles);

(async (fileList) => {
  const carbonTotalToc = [];
  const generalTotalToc = [];
  const protonTotalToc = [];
  for (const file of fileList) {
    const sdfData = await file.text();
    const sdf = parseSDF(sdfData);
    const { molecules, ...restMainSDF } = sdf;
    const { carbonToc, protonToc, generalToc } = await getToc({ molecules, restMainSDF });
    console.log(carbonToc)
    carbonTotalToc.push(...carbonToc);
    protonToc.push(...protonToc);
    generalTotalToc.push(...generalToc);
  }

  writeFileSync(join(pathToWrite, 'proton_toc_nmrshiftDB_small.json'), JSON.stringify(protonTotalToc));
  writeFileSync(join(pathToWrite, 'carbon_toc_nmrshiftDB_small.json'), JSON.stringify(carbonTotalToc));
  writeFileSync(join(pathToWrite, 'general_toc_nmrshiftDB_small.json'), JSON.stringify(generalTotalToc));
})(fileList)
