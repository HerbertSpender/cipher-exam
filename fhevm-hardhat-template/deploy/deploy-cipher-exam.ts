import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedCipherExam = await deploy("CipherExam", {
    from: deployer,
    log: true,
  });

  console.log(`CipherExam contract: `, deployedCipherExam.address);
};
export default func;
func.id = "deploy_cipherExam"; // id required to prevent reexecution
func.tags = ["CipherExam"];


