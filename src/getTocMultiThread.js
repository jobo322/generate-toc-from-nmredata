
const { join, resolve } = require('path');
const { parseSDF, NmrRecord } = require('nmredata');
const { fileListFromPath } = require('filelist-from');
const { signalsToRanges } = require('nmr-processing');
const { Molecule: OCLMolecule } = require('openchemlib/core');
const { getGroupedDiastereotopicAtomIDs } = require('openchemlib-utils');
const { writeFileSync } = require('fs');

const { Piscina } = require('piscina');

const { parse, stringify } = JSON;

const maxThreads = 2;

const pathToFiles = join(__dirname, '../dataTest/');
const pathToWrite = join(__dirname, '../');

const fileList = fileListFromPath(pathToFiles);

const piscina = new Piscina({
    filename: resolve(join(__dirname, 'worker.js')),
});

(async (fileList, piscina) => {
    const promises = [];
    for (const file of fileList) {
        const sdfData = await file.text();
        const sdf = parseSDF(sdfData);
        const { molecules, ...restMainSDF } = sdf;
        let batchSize = Math.floor(molecules.length / maxThreads);
        let list = new Array(maxThreads).fill(0);
        let diff = molecules.length - batchSize * maxThreads;
        list.forEach((_e, i, arr) => (arr[i] = molecules.splice(0, batchSize)));
        for (let i = 0; i < diff; i++) {
            list[i] = list[i].concat(molecules.splice(0, 1));
        }
        for (let i = 0; i < list.length; i++) {
            promises.push(
                piscina.run({ molecules: list[i], restMainSDF }, { name: 'getToc' })
            )
        }
    }

    await Promise.all(promises).then((result) => {
        const toc = [];
        for (let t of result) {
            toc.push(...t);
        }
        writeFileSync(join(pathToWrite, 'toc_nmrshiftDB.json'), JSON.stringify(toc));
    });

})(fileList, piscina)