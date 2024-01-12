using System.Diagnostics;
using System.Collections;
using System.Collections.Generic;
using System.IO;

using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Debug=UnityEngine.Debug;
using System;
using UnityEditor;
using UnityEditorInternal;
using System.Runtime.CompilerServices;
using SimpleFileBrowser;
using Unity.VisualScripting;

public sealed class UIController : MonoBehaviour{
    private const float MIN_ZOOM_SIZE=7,MAX_ZOOM_SIZE=120;
    private const float MIN_ANIMATION_SPEED=0.005f,MAX_ANIMATION_SPEED=3f;

    private static UIController _instance;
    public static UIController instance{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{
            return _instance;
        }
    }

    [SerializeField][Range(MIN_ZOOM_SIZE,MAX_ZOOM_SIZE)]private float hideEdgeSize;
    [SerializeField]private Camera cam;
    [SerializeField]private TMP_InputField vertexInput,colorInput;
    [SerializeField]private ToggleButton cameraControl,vertexControl,clickToSelect,showEdgeButton;
    [SerializeField]private Detail vertexDetail,graphDetail,inputDetail,edgeDetail;
    [SerializeField]private GameObject selectedVertexIndicator;
    [SerializeField]private Slider zoomSizeSlider;
    [SerializeField]private TextMeshProUGUI shellText;

    [Header("algorithm")]
    [SerializeField]private Button stopButton;

    [Header("animation")]
    [SerializeField]private GameObject animatonControlPanel;
    [SerializeField]private Slider animationSpeedSlider;
    [SerializeField]private ToggleButton resumeRun,pauseRun,openAnimationPanel;

    [Header("input counter")]
    [SerializeField]private TextMeshProUGUI graphDataText;//show the number of vertex and edge

    private Vector2 previousScreenPosition;//used in LateUpdate for zoom in/out
    private float _animationSpeed;
    public float animationSpeed{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{
            return _animationSpeed;
        }
    }


    //if true is passed it, showing of edge only is controlled by user
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public bool HideEdge(bool forceHideOnly=false){
        return showEdgeButton.isOn==false||(forceHideOnly==false&&cam.orthographicSize>hideEdgeSize);
    }

    [System.Serializable]
    public struct Detail{
        [SerializeField]private Button openButton;
        [SerializeField]private TextMeshProUGUI triangle;
        [SerializeField]private GameObject panel;
        [System.NonSerialized]private bool isOpened;

        public void Init() {
            isOpened=false;
            triangle.text="<";
            panel.SetActive(false);
        }

        public void Toggle() {
            switch (isOpened){
            case true:{
                triangle.text="<";
                panel.SetActive(false);
                isOpened=false;
                break;
            }
            case false:{
                triangle.text=">";
                panel.SetActive(true);
                isOpened=true;
                break;
            }
            }
        }
        
        public void Set(bool active){
            isOpened=active;
            panel.SetActive(active);
            switch (active){
            case true:{
                triangle.text=">";
                break;
            }
            case false:{
                triangle.text="<";
                break;
            }
            }
        }
    }


    [System.Serializable]
    public struct ToggleButton {
        public Button button;
        public bool isOn {get;private set;}

        public void Init(bool onlyColor=false) {
            button.GetComponent<Image>().color=Color.red;
            if(onlyColor==false){
                button.transform.GetComponentInChildren<TextMeshProUGUI>().text="Off";
            }
            isOn=false;
        }

        //return bool after toggle
        public bool Toggle(bool onlyColor=false) {
            if(isOn) {
                button.GetComponent<Image>().color=Color.red;
                if(onlyColor==false){
                    button.transform.GetComponentInChildren<TextMeshProUGUI>().text="Off";
                }
                isOn=false;
            }
            else {
                isOn=true;
                button.GetComponent<Image>().color=Color.green;
                if(onlyColor==false){
                    button.transform.GetComponentInChildren<TextMeshProUGUI>().text="On";
                }
            }
            return isOn;
        }


        public void Set(bool value,bool onlyColor=false) {
            if(value==isOn) {
                return;
            }
            if(value==false) {
                button.GetComponent<Image>().color=Color.red;
                if(onlyColor==false){
                    button.transform.GetComponentInChildren<TextMeshProUGUI>().text="Off";
                }
                isOn=false;
            }
            else {
                isOn=true;
                button.GetComponent<Image>().color=Color.green;
                if(onlyColor==false){
                    button.transform.GetComponentInChildren<TextMeshProUGUI>().text="On";
                }
            }
        }
    }


    private enum CameraMove:byte{
        Stop,Start,Stay
    }
    private CameraMove cameraMove;
    private Vector2 dragOrigin;
    private GameObject selectedVertexGO;
    private int _selectedVertexID;
    public int selectedVertexID{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{ return _selectedVertexID; }
    }



    void Awake() {
        _instance=this;
        cameraMove = CameraMove.Stop;
        cameraControl.Init();
        vertexControl.Init();
        clickToSelect.Init();
        showEdgeButton.Init();
        showEdgeButton.Set(true);

        vertexDetail.Init();
        graphDetail.Init();
        inputDetail.Init();
        edgeDetail.Init();
        selectedVertexGO=null;

        animatonControlPanel.SetActive(false);
        resumeRun.Init(true);
        pauseRun.Init(true);
        openAnimationPanel.Init();

        FileBrowser.SetExcludedExtensions( ".lnk", ".tmp", ".zip", ".rar", ".exe",".meta",".cpp");
        FileBrowser.AddQuickLink( "current", string.Format("{0}/Graph/",Application.dataPath), null );
        SetGraphData(0,0);
        stopButton.enabled=false;
        _selectedVertexID=-1;

        zoomSizeSlider.minValue=MIN_ZOOM_SIZE;
        zoomSizeSlider.maxValue=MAX_ZOOM_SIZE;
        zoomSizeSlider.value=cam.orthographicSize;
        zoomSizeSlider.onValueChanged.AddListener(OnZoomSliderChanged);

        _animationSpeed=animationSpeedSlider.value;
    }

    private void TestProcess() {
        try {
            Debug.Log($"start process now {Application.dataPath}");
            Process p=new Process();
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.FileName = $"{Application.dataPath}/test.exe";
            p.StartInfo.CreateNoWindow = true;
            p.StartInfo.RedirectStandardOutput=true;
            p.OutputDataReceived+=new DataReceivedEventHandler((sender, e) =>{
                Debug.Log($"received \"{e.Data}\"");
            });
            p.Start();
            p.BeginOutputReadLine();
            p.WaitForExit();
            p.Close();
            p.Dispose();
        }
        catch (System.Exception e){
            Debug.Log(e);
        }
    }


    void Update() {
        if(clickToSelect.isOn) {
            if(Input.GetKeyDown(KeyCode.Mouse1)) {
                _selectedVertexID=GraphConstructor.instance.TryGetVertexGO(cam.ScreenToWorldPoint(Input.mousePosition),out selectedVertexGO);
                if(_selectedVertexID>=0) {
                    vertexInput.text=_selectedVertexID.ToString();
                    int shell=GraphConstructor.instance.GetShellOfVertex(_selectedVertexID);
                    if(shell<0){
                        shellText.text=$"Shell:--";
                    }
                    else{
                        shellText.text=$"Shell:{shell}";
                    }
                }
            }
        }
        if(vertexControl.isOn) {
            if(selectedVertexGO!=null) {
                if(Input.GetKey(KeyCode.Mouse1)) {
                    Vector3 pos=cam.ScreenToWorldPoint(Input.mousePosition);
                    pos.z=0;
                    selectedVertexGO.transform.position=pos;
                    GraphConstructor.instance.MoveEdgePosition(_selectedVertexID,pos);
                    pos.z=0.5f;
                    selectedVertexIndicator.transform.position=pos;
                }
                else if(Input.GetKeyUp(KeyCode.Mouse1)) {
                    GraphConstructor.instance.SetVertexPosition(selectedVertexGO);
                }
            }
        }
    }


    void LateUpdate() {
        if(!vertexControl.isOn&&cameraControl.isOn) {
            bool cameraMoved=false;
            switch(cameraMove) {
            case CameraMove.Stop: {
                break;
            }
            case CameraMove.Start: {
                if(Input.GetKeyDown(KeyCode.Mouse0)){
                    dragOrigin=cam.ScreenToWorldPoint(Input.mousePosition);
                    cameraMove = CameraMove.Stay;
                }
                break;
            }
            case CameraMove.Stay: {
                if(Input.GetKey(KeyCode.Mouse0)==false){
                    cameraMove=CameraMove.Start;
                    break;
                }
                Vector3 different=(Vector3)dragOrigin-cam.ScreenToWorldPoint(Input.mousePosition);
                different.z=0;
                cam.transform.position+=different;
                cameraMoved=true;
                break;
            }
            }

            if(Input.GetKeyDown(KeyCode.Mouse1)) {
                previousScreenPosition=Input.mousePosition;
            }
            else if(Input.GetKey(KeyCode.Mouse1)){
                float different=Input.mousePosition.x-previousScreenPosition.x;
                previousScreenPosition=Input.mousePosition;
                cam.orthographicSize=Mathf.Clamp(cam.orthographicSize+different/75f,MIN_ZOOM_SIZE,MAX_ZOOM_SIZE);
                zoomSizeSlider.value=cam.orthographicSize;
                cameraMoved=true;
            }

            if(cameraMoved){//only refresh the edge if there is no any algorithm running
                GraphConstructor.instance.UpdateAllEdges(HideEdge());
            }
        }
    }

    public void OnMoveCameraPressed() {
        if(cameraControl.Toggle()) {
            cameraMove=CameraMove.Start;
        }
        else {
            cameraMove=CameraMove.Stop;
        }
    }
    
    public void OnVertexPanelPressed() {
        vertexDetail.Toggle();
        edgeDetail.Set(false);
        graphDetail.Set(false);
        inputDetail.Set(false);
        KCore.Instance.CloseAlgoDetail();
    }

    public void OnEdgePanelPressed(){
        vertexDetail.Set(false);
        edgeDetail.Toggle();
        graphDetail.Set(false);
        inputDetail.Set(false);
        KCore.Instance.CloseAlgoDetail();
    }

    public void OnGraphDetailPressed() {
        vertexDetail.Set(false);
        edgeDetail.Set(false);
        graphDetail.Toggle();
        inputDetail.Set(false);
        KCore.Instance.CloseAlgoDetail();
    }

    public void OnScreenPanelPressed(){
        vertexDetail.Set(false);
        edgeDetail.Set(false);
        graphDetail.Set(false);
        inputDetail.Toggle();
        KCore.Instance.CloseAlgoDetail();
    }

    public void CloseAllDetails(){
        vertexDetail.Set(false);
        edgeDetail.Set(false);
        graphDetail.Set(false);
        inputDetail.Set(false);
    }


    public void OnRandomLayoutPressed() {
        selectedVertexIndicator.SetActive(false);
        GraphConstructor.instance.RandomLayout();
    }


    public void OnRefreshLayout(){
        selectedVertexIndicator.SetActive(false);
        GraphConstructor.instance.RefreshLayout();
    }


    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void SetGraphData(in int vertexNumber,in int edgeNumber){
        graphDataText.text=string.Format("|V|:{0}\n|E|:{1}",vertexNumber,edgeNumber);
    }


    public void OnTeleportCameraPressed() {
        if(int.TryParse(vertexInput.text,out int v)==false) {
            Debug.Log("teleport fail");
        }
        else if(GraphConstructor.instance.TryGetVertexGO(v,out GameObject vertexGO)==false){
        }
        else {
            Vector3 pos=vertexGO.transform.position;
            pos.z=cam.transform.position.z;
            cam.transform.position=pos;            
        }
    }

    public void OnEnterVertex() {
        if(int.TryParse(vertexInput.text,out _selectedVertexID)==false) {
            selectedVertexIndicator.SetActive(false);
            _selectedVertexID=-1;
        }
        else if(GraphConstructor.instance.TryGetVertexGO(_selectedVertexID,out GameObject vertexGO)==false) {
            selectedVertexIndicator.SetActive(false);
            _selectedVertexID=-1;
        }
        else {
            if(selectedVertexGO != null) {
                GraphConstructor.instance.SetVertexPosition(selectedVertexGO);
            }
            int shell=GraphConstructor.instance.GetShellOfVertex(_selectedVertexID);
            if(shell<0){
                shellText.text=$"Shell:--";
            }
            else{
                shellText.text=$"Shell:{shell}";
            }
            selectedVertexIndicator.SetActive(true);
            selectedVertexGO=vertexGO;
            selectedVertexIndicator.transform.localScale=vertexGO.transform.localScale+new Vector3(0.2f,0.2f);
            selectedVertexIndicator.transform.position=vertexGO.transform.position+new Vector3(0,0,0.5f);//slightly behind the vertex
        }
    }

    public void OnMoveVertexPressed() {
        if(vertexControl.Toggle()) {
            if(int.TryParse(vertexInput.text,out int v)==false) {

            }
            else if(GraphConstructor.instance.TryGetVertexGO(v,out selectedVertexGO)==false) {

            }
            else {

            }
        }
        else {
            if(selectedVertexGO!=null) {
                GraphConstructor.instance.SetVertexPosition(selectedVertexGO);
                selectedVertexGO=null;
            }
        }
    }

    public void OnClickToSelectPressed() {
        if(clickToSelect.Toggle()) {
            if(selectedVertexGO!=null) {
                GraphConstructor.instance.SetVertexPosition(selectedVertexGO);
                selectedVertexGO=null;
            }
            selectedVertexIndicator.SetActive(true);
        }
        else{
            selectedVertexIndicator.SetActive(false);
        }
    }


    public void OnShowEdgePressed(){
        showEdgeButton.Toggle();
        GraphConstructor.instance.UpdateAllEdges(showEdgeButton.isOn==false);
    }

    unsafe public void OnSetColorPressed() {
        Color c;
        if(int.TryParse(vertexInput.text,out int v)==false) {
        }
        else if(GraphConstructor.instance.TryGetVertexGO(v,out GameObject vertexGO)==false) {
        }
        else if(TryGetColor(colorInput.text,&c)==false) {
        }
        else {
            vertexGO.GetComponent<SpriteRenderer>().color=c;
        }
    }

    unsafe private bool TryGetColor(string str,Color*color) {
        if(str==null||color==null||str.Length!=6) {
            return false;
        }
        else {
            int*digits=stackalloc int[6];
            for(int i = 0;i<6;i++) {
                char a = str[i];
                if(a>='0'&&a<='9') {
                    digits[i]=a-'0';
                }
                else if(a>='a'&&a<='f') {
                    digits[i]=a-'a'+10;
                }
                else if(a>='A'&&a<='F') {
                    digits[i]=a-'A'+10;
                }
                else {
                    return false;
                }
            }
            color->a=1;
            color->r=(digits[0]*16+digits[1])/255f;
            color->g=(digits[2]*16+digits[3])/255f;
            color->b=(digits[4]*16+digits[5])/255f;

            return true;
        }
    }


    private void OnZoomSliderChanged(float x){
        cam.orthographicSize=zoomSizeSlider.value;
        GraphConstructor.instance.UpdateAllEdges(HideEdge());
    }


    public void OnToggleAnimationPanel(){
        animatonControlPanel.SetActive(openAnimationPanel.Toggle());
    }


    public void OnAnimationSpeedChanged(){
        _animationSpeed=animationSpeedSlider.value*(MAX_ANIMATION_SPEED-MIN_ANIMATION_SPEED)+MIN_ANIMATION_SPEED;
    }


    public void OnResumeAlgoPressed(){
        pauseRun.Set(false,true);
        resumeRun.Set(true,true);
        KCore.Instance.ResumeRunning();
    }

    public void OnPauseAlgoPressed(){
        resumeRun.Set(false,true);
        pauseRun.Set(true,true);
        KCore.Instance.PauseRunning();
    }

    public void OnStartAlgoPressed(){
        animatonControlPanel.SetActive(true);
        openAnimationPanel.Set(true);
        stopButton.enabled=true;
        resumeRun.Set(true,true);
        selectedVertexIndicator.SetActive(false);
        GraphConstructor.instance.SetAllEdgeThinness(true);
        KCore.Instance.StartRunning();
    }


    public void OnAlgoEnd(){
        stopButton.enabled=false;
        animatonControlPanel.SetActive(false);
        openAnimationPanel.Set(false);
    }

    public void OnStopAlgoPressed(){
        OnAlgoEnd();
        KCore.Instance.StopRunning();
    }


    public void OnNextStepAlgoPressed(){
        KCore.Instance.NextStep();
    }


    public void OnPreviousStepAlgoPressed(){
        KCore.Instance.NextStep();
    }


    public void OnOpenFile(){
        StartCoroutine(WaitForInputFile());
    }


    private IEnumerator WaitForInputFile(){
        yield return FileBrowser.WaitForLoadDialog(FileBrowser.PickMode.FilesAndFolders, false, null, null, "Load Files and Folders", "Select" );

        if(FileBrowser.Success){
            Debug.Log("success");
            if(FileBrowser.Result.Length<=0){
                yield break;
            }
            Debug.Log($"return file:{FileBrowser.Result[0]}");
            try{
                StreamReader reader=new StreamReader(FileBrowser.Result[0]);
                string text=reader.ReadToEnd();
                GraphConstructor.instance.ProcessTextFile(text);
                KCore.Instance.StopRunning();
                reader.Close();
                reader.Dispose();
            }catch(Exception e){
                Debug.LogError($"catch {e} while open file {FileBrowser.Result[0]}");
            }
        }
        else{
            Debug.Log("fail to get file");
        }
    }

    public void OnFinishDirectlyPressed(){
        KCore.Instance.StopRunning(true);
        GraphConstructor.instance.SetAllVerticesColor(false);
        GraphConstructor.instance.SetAllEdgeThinness(false);
    }
}
