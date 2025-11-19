import { run } from "hardhat";
import * as fs from 'fs';

export async function verifyContract(
    contractAddress: string,
    constructorArguments: any
  ) {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
}

async function getFileName(network_name:string){
    let file_name;
    console.log(network_name)
    switch(network_name){
      case "goerli":{
        file_name = "output_goerli.json"
        break;
      }
      case "mainnet":{
        file_name = "output_mainnet.json"
        break;
      }
      case "holesky":{
        file_name = "output_holesky.json"
        break;
      }
      case "bsc":{
        file_name = "output_bsc.json"
        break;
      }
      case "sepolia":{
        file_name = "output_sepolia.json"
        break;
      }
      case "local":{
        file_name = "output_local.json"
        break;
      }
      case "berachain":{
        file_name = "output_bera.json"
        break;
      }
      default:{
        throw Error("Network not recognized")
      }
    }
    return process.cwd() + "/script/" + file_name;
}
export async function readFile(network_name:string){

    const output_file = await getFileName(network_name)
    if(output_file){
      return JSON.parse(fs.readFileSync(output_file,"utf-8"))
    }
    else{
      throw Error("output file with necessay parameters is not present")
    }
}

export async function writeFile(network_name:string, output){
    const output_file = await getFileName(network_name)
    await fs.writeFile(output_file, JSON.stringify(output), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
      });
}


export async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
