'use strict';

const { NmrRecord } = require('nmredata');
const { signalsToRanges } = require('nmr-processing');
const { Molecule: OCLMolecule } = require('openchemlib/core');
const { getGroupedDiastereotopicAtomIDs } = require('openchemlib-utils');

const { parse, stringify } = JSON;
const { writeFileSync } = require('fs');

async function getToc(options) {
    const toc = [];
    let counter = 1;
    const { workerID, molecules, restMainSDF } = options;
    for (const currentSDF of molecules) {
        writeFileSync(`worker${workerID}_log.json`,`${JSON.stringify(currentSDF)}`)
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
    }
    return toc;
}


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

module.exports = {
    getToc,
}
