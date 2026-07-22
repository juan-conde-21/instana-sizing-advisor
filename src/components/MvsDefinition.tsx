export function MvsDefinition() {
  return (
    <section className="section-card" id="mvs">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Unidad comercial</p>
          <h2>¿Qué se cuenta como MVS?</h2>
          <p><strong>MVS significa Managed Virtual Server</strong> y es la unidad utilizada para contar la infraestructura monitoreada.</p>
        </div>
      </div>
      <div className="definition-grid">
        <article>
          <h3>Para calcular las licencias ingresa solo estas cantidades</h3>
          <ul>
            <li><strong>Servidores físicos:</strong> equipos dedicados con Linux, Windows, AIX, Solaris u otro sistema operativo soportado.</li>
            <li><strong>Servidores virtuales:</strong> máquinas virtuales en VMware, Hyper-V, IBM Cloud, AWS, Azure, Google Cloud u otra nube.</li>
            <li><strong>Worker nodes:</strong> nodos de trabajo de Kubernetes, OpenShift, AKS, EKS o GKE donde se ejecutan las aplicaciones.</li>
          </ul>
        </article>
        <article className="warning-panel">
          <h3>No cuentes</h3>
          <p>Pods, contenedores, aplicaciones, usuarios, transacciones, switches, routers, firewalls o balanceadores.</p>
          <p>Los sistemas operativos y la ubicación sirven para entender el alcance, pero no se ingresan por separado para calcular la cantidad de MVS.</p>
        </article>
      </div>
      <div className="example-note">2 servidores físicos + 18 servidores virtuales + 3 worker nodes de OpenShift = <strong>23 MVS</strong>.</div>
    </section>
  );
}
