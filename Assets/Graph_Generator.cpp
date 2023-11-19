#include <stdio.h>
#include <time.h>
#include <stdlib.h>
#include <string>
#include <vector>
#include <stack>
#include <bitset>
#include <iostream>
using namespace std;

stack<int> _stack;
vector<vector<int>> graph(0);
vector<bool> visited(0);
vector<int> visited_vertex(0);

void DFS(int start){
    _stack.push(start);
    visited[start]=true;
    while(!_stack.empty()){
        int x=_stack.top();
        visited_vertex.push_back(x);
        _stack.pop();
        for(int i=0;i<graph[x].size();i++){
            if(visited[graph[x][i]]){
                continue;
            }
            visited[graph[x][i]]=1;
            _stack.push(graph[x][i]);
        }
    }
}

int main(int argc,char**argv){
    if(argc!=4){
        printf("execpted argument:<.exe> <number of vertex> <base probabltity> <output file name>");
        return 1;
    }
    srand(time(NULL));
    int num_of_vertex;
    float base;
    try{
        num_of_vertex=stoi(argv[1]);
        base=stof(argv[2]);
    }
    catch(exception e){
        printf("fail to parse, reason: %s\n",e.what());
        return 1;
    }

    int total_edge=0;
    
    graph=vector<vector<int>>(num_of_vertex);
    visited=vector<bool>(num_of_vertex,0);
    for(int i=0;i<num_of_vertex;i++){
        int j;
        float min=(rand()/(float)RAND_MAX)+base;
        for(j=0;j<i;j++){
            if((rand()/(float)RAND_MAX)>min){
                graph[i].push_back(j);
            }
        }
        for(j=i+1;j<num_of_vertex;j++){
            if((rand()/(float)RAND_MAX)>min){
                graph[i].push_back(j);
            }
        }
    }

    DFS(0);
    for(int i=1;i<num_of_vertex;i++){
        if(visited[i]){
            continue;
        }
        graph[i-1].push_back(i);
        DFS(i);
    }

    FILE* file=fopen(argv[3],"w");
    for(int i=0;i<num_of_vertex;i++){
        total_edge+=graph[i].size();
        for(int j=0;j<graph[i].size();j++){
            fprintf(file,"%d %d\n",i,graph[i][j]);
        }
    }
    fclose(file);
    printf("edge number:%d\n",total_edge);
    return 0;
}

