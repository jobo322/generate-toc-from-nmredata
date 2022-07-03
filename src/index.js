'use strict';

const { join } = require('path');
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
  const toc = [];
  for (const file of fileList) {
    const sdfData = await file.text();
    const sdf = parseSDF(sdfData);
    const { molecules, ...restMainSDF } = sdf;
    let counter = 0;

    for (const currentSDF of molecules) {
      const nmredata = NmrRecord.getNMReData({ molecules: [currentSDF], ...restMainSDF });
      // console.log(nmredata)
      const json = await NmrRecord.toJSON({ sdf: { molecules: [currentSDF], ...restMainSDF } });

      const { smiles, molfile } = json.molecules[0];
      const molecule = OCLMolecule.fromMolfile(molfile);
      const diaIDs = getGroupedDiastereotopicAtomIDs(molecule);
      const {
        nucleus,
        signals = [],
        frequency = 400,
        experiment,
      } = json.spectra[0];

      const meta = getMetadata({ nmredata, toExclude: ['assignment', 'version', 'name', 'smiles', 'nucleus', 'solvent'] })
      const solvent = nmredata.SOLVENT ? nmredata.SOLVENT.data[0].value : '';
      const signalsWithNbAtoms = setNbAtoms(signals, diaIDs);
      const ranges = signalsToRanges(signalsWithNbAtoms)

      toc.push({
        ocl: molecule.getIDCodeAndCoordinates(),
        ranges,
        smiles: Array.isArray(smiles) ? smiles[0] : smiles,
        nucleus,
        solvent,
        names: molfile.split('\n').slice(0, 1),
        meta: { experiment, frequency, ...meta },
      });
      counter++;
      console.log(`progress: ${counter / molecules.length * 100} %`);
    }
  }

  writeFileSync(join(pathToWrite, 'toc_nmrshiftDB.json'), JSON.stringify(toc));
})(fileList)

function setNbAtoms(signals, diaIDs) {
  const result = parse(stringify(signals));
  for (const signal of result) {
    let nbAtoms = 1;
    if (signal.diaIDs.length > 1) {
      const diaID = signal.diaIDs[0];
      const info = diaIDs.find((data) => {
        return data.oclID === diaID;
      })
      if (info) {
        nbAtoms = info.atoms.length
      }
    }
    signal.nbAtoms = nbAtoms;
  }
  return result;
}

function getMetadata(options) {
  const { nmredata, toExclude } = options;

  const result = {};

  for (const tag in nmredata) {
    const ctag = tag.toLowerCase();
    if (ctag.match(/[1|2]d_/s)) continue;
    if (toExclude.includes(ctag)) continue;
    result[ctag] = parse(stringify(nmredata[tag].data.map((d) => (typeof d === 'object' ? d.value : d))));
  }
  return result;
}
